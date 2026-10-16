# BACKEND.md: Yaadon ki Baithak

The server side of Baithak: AI routes, authentication, database. Companion to
`README.md` (setup and rules) and `DESIGN.md` (UI). Read this before touching
anything under `apps/web/app/api`, `apps/web/lib/server`, `apps/web/proxy.ts`,
`apps/web/lib/supabase`, or `supabase/`.

The frontend lives and dies by one contract: `apps/web/lib/api.ts` is the only
door from the browser to the agents. Every route below either answers with the
documented shape or fails with an error status; the browser then falls back to a
plain stand-in so the app always works. Never break that contract.

## 1. The three parts

```
Browser (lib/api.ts)                       Server (Next.js route handlers)
  askNext()      ── POST /api/turn        ── interviewer agent      (Gemini Flash)
  transcribe()   ── POST /api/transcribe  ── Gemini audio, Whisper backup, saves the voice clip
  writeChapter() ── POST /api/story       ── story writer agent     (Gemini Flash)
  illustrate()   ── POST /api/illustrate  ── FLUX.1 schnell         (Cloudflare Workers AI) + private image bucket
  speak()        ── POST /api/tts         ── Gemini TTS
  SharePage      ── GET  /api/share/[token] ── public read of a shared book (service role)
```

- **Routes** stay thin: validate, authorize, call one provider or the database,
  respond. Prompts and shared types live in `@baithak/agents` and contain no
  keys and no fetch calls.
- **Authentication** is Supabase Auth (email + password with confirmation,
  Google OAuth). Pages are guarded by `proxy.ts`; API routes are guarded by
  `requireUser()` in `lib/server/auth.ts`.
- **Database** is Postgres via Supabase (`supabase/migrations/`), row level
  security on every table, and two private storage buckets (`audio`, `images`).
  The browser writes with the signed-in user's own session (RLS decides
  ownership); the server writes with the service role key, imported only from
  `lib/supabase/admin.ts`.

## 2. Environment variables

All in `apps/web/.env.local`, never committed. **Secrets never get a
`NEXT_PUBLIC_` prefix and are only read inside route handlers or `lib/server`.**

| Variable | Used by | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | both sides | Without both, the whole app runs in local demo mode |
| `GEMINI_API_KEY` | `/turn`, `/story`, `/transcribe`, `/tts` | Google AI Studio key (free tier) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `/illustrate`, `/transcribe` backup | Cloudflare Workers AI (free tier) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` only | Server-side writes that bypass RLS: image upload, public share read |
| `HF_TOKEN` | reserved | Hugging Face, only if a fallback model is ever needed |

Optional overrides (defaults shown): `GEMINI_MODEL=gemini-2.5-flash`,
`GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts`,
`CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell`,
`CLOUDFLARE_TRANSCRIBE_MODEL=@cf/openai/whisper-large-v3-turbo`.

## 3. Error contract

Every route uses the same statuses, because the browser maps them to behavior:

| Status | Meaning | What the browser does |
| --- | --- | --- |
| `200` | Body matches the documented shape | Uses the AI answer |
| `400` | Body failed validation or was oversized | Falls back to the stand-in |
| `401` | Not signed in | Stand-in; the elder flow keeps working offline-ish |
| `403` | Request came from a foreign origin (CSRF) | Stand-in |
| `429` | Rate limit hit, or the provider's quota | Stand-in; nothing is invented |
| `501` | Provider not configured (key missing) | Stand-in (this is the demo-mode path) |
| `502` | Provider failed or answered badly | Stand-in; never papered over with generated content |
| `503` | Server not set up (production without keys) | Stand-in |

Error bodies are always `{ "error": "short friendly sentence" }`. Raw provider
errors are logged server-side only and never echoed to the client.

## 4. The routes

Shared rules for all five AI routes:
- **One guard line** — `guardApi(request, route)` in `lib/server/guard.ts`,
  which runs in order: foreign `Origin` header → `403` (CSRF), over the rate
  window (60 requests/minute per route per client IP) → `429`, then the auth
  check from §5. The rate check runs before auth so an anonymous cookie storm
  can't spend the Supabase auth quota either. The limiter is in-memory and
  therefore per-instance: honest best effort, not a global guarantee.
- **Bodies are capped and clamped**: JSON goes through `readJson()` (256 KB,
  checked on Content-Length and on the parsed text), multipart audio is capped
  at 20 MB, and every field the model sees is trimmed to a bounded length.
- Auth: `requireUser()` inside the guard (see §5). Local dev without Supabase
  keys counts as signed in, so practice mode still runs.
- Model calls use plain `fetch` against the provider REST API from
  `lib/server/gemini.ts` and `lib/server/cloudflare.ts`, each with a hard
  timeout (`AbortSignal.timeout`: 30 s Gemini, 45 s Cloudflare) so a hung
  model can't hold a request open. No SDK dependencies: free tiers, zero
  install, and the keys never leave the server.

### POST /api/turn — the interviewer

- Body: `{ elder: ElderProfile, theme, turns: Turn[], skipped?: boolean }`
  (turns clamped to the last 30, 2 000 chars each).
- Runs `interviewerSystemPrompt` + `interviewerUserPrompt` from
  `@baithak/agents` on Gemini Flash in JSON mode (`responseMimeType:
  application/json`). When `skipped` is true a note is appended telling Birdy
  the elder passed on the last question.
- Response: `InterviewerDecision` exactly as typed in `@baithak/agents`
  (`action`, `question.{ur,en}`, `why`, `heard`). The JSON is validated and
  reshaped; anything unexpected is a `502` and the browser uses its practice
  questions.
- Safety rails come from the prompt (no PII questions, one short question,
  wrap up after ~8 answers). The route adds no facts of its own.

### POST /api/story — the writer

- Body: `{ elder, theme, turns }` (turns clamped to the last 60).
- Runs `storyWriterSystemPrompt` + `storyWriterUserPrompt` on Gemini Flash in
  JSON mode. Response: `Chapter` (`title.{ur,en}`, `body.{ur,en}`,
  `sourceTurns`, optional `pullQuote.{text,turnIndex}`, `year`, `place`).
- The route only **reshapes and bounds** the model's JSON; it never adds or
  repairs content. If the shape is wrong the route answers `502` and the
  browser saves the plain transcript as a labelled draft. That is the "never
  invent facts" rule enforced in code.

### POST /api/transcribe — the elder's answer

- Body: `FormData { audio: Blob (webm/opus or mp4), lang: "ur" | "en",
  sessionId?: string }`. Size limit 20 MB (inline limit for Gemini).
- First: Gemini Flash with the audio inline (`inlineData`), prompt "transcribe
  verbatim". Backup: Cloudflare Whisper (`whisper-large-v3-turbo`).
- If the caller is signed in **and** passes a `sessionId`, the route also
  stores the real recording in the private `audio` bucket under
  `{familyId}/audio/{uuid}.webm` (ownership proven by RLS through the user's
  own session, no service key involved) and returns its path.
- Response: `{ text, audioPath? }`. The browser keeps the IndexedDB copy for
  instant playback and stores `audioPath` on the turn so it reaches the
  database. Missing text or failed transcription → the browser's own live
  captions are used instead.

### POST /api/illustrate — the painting

- Body: `{ chapter: Chapter, familySeed: number }`.
- `illustrationRequest()` from `@baithak/agents` builds the FLUX.1 schnell
  prompt (fixed gouache style, family seed for cross-chapter consistency).
  The route calls Workers AI (`guidance` 3.5, 4 steps, 1024×1024) and gets a
  PNG back.
- The PNG is stored in the private `images` bucket at
  `{familyId}/chapter-{uuid}.png` using the **service role** client
  (`lib/supabase/admin.ts`) after the family is looked up for the signed-in
  user, and the response carries a **signed URL** (7 days). Without a service
  key or a family row, the route returns the image as a `data:` URL instead,
  so demo mode still shows a real painting.
- Response: `{ imageUrl }`. Failure → `502` and the browser shows the topic's
  painted scene.

### POST /api/tts — Birdy's voice

- Body: `{ text (≤ 500 chars), lang: "ur" | "en" }` → `audio/wav` bytes.
- Gemini TTS (`GEMINI_TTS_MODEL`) with a prebuilt voice, 24 kHz 16-bit mono
  PCM wrapped into a WAV container by the route. Urdu support depends on the
  model: if the model refuses, the route answers `502` and the browser falls
  back to its own `speechSynthesis` voice (`ur-PK`). The elder's real voice is
  never synthesized, cloned or imitated — TTS is only for Birdy's questions.

### GET /api/share/[token] — the only public route

- No authentication. `token` is looked up in `share_links` with the **service
  role** client: missing, revoked or expired all answer the same `404` (no
  oracle for guessing tokens).
- On success returns the read-only book for relatives:
  `{ familyName, elders: [{ id, name, relation, language }], chapters: [{ id,
  sessionId, elderId, theme, createdAt, chapter, turns, imageUrl }] }` with
  fresh 7-day signed URLs for each chapter painting that has a stored path
  (chapters saved before that path is kept fall back to their topic's painted
  scene) and no audio paths (voice on shared links is a later phase).
- The share page prefers this route and falls back to the book saved on the
  device, so the old demo flow still works.

## 5. Authentication

- **Sign-up and sign-in** live in `/signup` (email + password, Google).
  Email confirmation is ON; links land on `/auth/callback`, which exchanges the
  code and returns to a `safePath()`-checked destination.
- **`proxy.ts`** (Next 16's middleware convention; `middleware.ts` is
  deprecated here) runs before every page and API request: it refreshes the
  Supabase cookie so sessions don't expire mid-sitting, and redirects
  signed-out visitors away from `/book` and `/onboarding`.
  `/record` stays open — the elder never needs an account.
- **`requireUser()`** (`lib/server/auth.ts`) is the auth half of `guardApi()`
  and runs for all five AI routes with the same semantics as `proxy.ts`:
  - Supabase configured → `auth.getUser()` from the request cookies; no user →
    `401`.
  - Not configured → allowed only when `NODE_ENV !== "production"` (local
    demo, same rule as the proxy).
  - Not configured in production → `503` with a setup message.
- **Authorization** is row level security, not application code: every table
  checks `owns_family(...)` server-side, so even a leaked anon key can only see
  the caller's own family. The service role key is used in exactly two places
  (illustrate upload, share read) and never reaches the browser.
- A family phone shared between accounts is handled by `claimBook(userId)` on
  the client: a book owned by someone else is cleared on sign-in.

## 6. Database

Schema and RLS: `supabase/migrations/0001_init.sql` (apply with the SQL editor
or `supabase db push`), plus `0002_turn_duration.sql` (adds `turns.duration_ms`
so shared chapters can show "3 min 20 s of voice", and indexes the foreign-key
columns every list/share read filters on — Postgres doesn't index those
itself). The `share_links` token default uses only built-in functions
(`md5` + `gen_random_uuid`), so no extension has to be enabled first.

```
families 1─* elders 1─* sessions 1─* turns
                          └──────* chapters
share_links → families        storage: audio/, images/ (private, {family_id}/…)
```

- `owns_family(uuid)` is the single ownership check used by every RLS policy;
  storage policies trust the first folder of the path as the family id.
- Share pages read through the service role because there is deliberately **no
  anon read policy** on chapters.

**Persistence strategy (Phase 1): local-first, dual-write.**
The UI keeps reading localStorage/IndexedDB synchronously — demo mode works
with zero keys and nothing breaks offline — while `lib/data/remote.ts` pushes
the same objects into Postgres whenever Supabase is configured:

| Local store | Remote table | Pushed by |
| --- | --- | --- |
| `book-store` `FamilyBook` | `families` + `elders` | `saveBook()` → `pushBook()` |
| `chapter-store` `Session`/`Turn` | `sessions` + `turns` (upsert on `session_id, idx`) | `saveSession()` → `pushSession()` |
| `chapter-store` `StoredChapter` | `chapters` | `saveChapter()` → `pushChapter()` |
| `book.shareToken` | `share_links` (create / revoke) | Share panel → `pushShareLink()` |
| `audio-store` clip | `storage.audio` | `/api/transcribe` (returns `audioPath`, stored on the turn) |

Identity across both worlds: `newId()` returns real UUIDs, so the id in
localStorage is the row id in Postgres. Books created before this change have
non-UUID ids and simply skip remote writes (they stay local-only). Every push
is fire-and-forget and swallowed: a database hiccup never breaks the elder's
recording screen.

## 7. Conventions

- Free tiers only; model choices exist because of free tiers.
- No voice cloning anywhere. The elder's real recordings only; TTS is Birdy
  only; the story writer never invents facts, and the routes never paper over a
  model failure with generated content.
- Never log or return API keys; never echo raw provider errors to clients.
- Validate and clamp everything from the browser; treat provider output as
  untrusted JSON.
- Owner map unchanged: agents and routes (Ayesha), UI (Faria), database and
  pitch (Humema).

## 8. Phases

**Phase 1 — implemented:**
all six routes above with fallback chains; the `guardApi` guard (CSRF origin
check, per-instance rate limit, auth); body size caps and provider timeouts;
`lib/supabase/admin.ts`; dual-write persistence for families, elders, voice
clip upload, turn durations; token-validated public share route; image
storage in the private bucket; FK indexes.

**Phase 2 — next:**
signed-URL playback of voice clips on shared links; restoring a family book
from the database onto a new device; a durable (Redis/Upstash) shared rate
limiter when running multiple instances; upload of old WhatsApp voice notes
(the "Soon" card); retiring localStorage once remote writes are proven.

Two platform notes for Vercel: request bodies are capped at ~4.5 MB there
(very long answers fall back to captions, or record on the mobile web app's
smaller payloads), and the in-memory rate limiter resets per instance — both
are acceptable for launch and tracked in Phase 2.

---
title: Yaadon ki Baithak API
emoji: 🪔
colorFrom: indigo
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Backend: Yaadon ki Baithak

The Python service that runs the agents. It's separate from the Next.js frontend
and deployed on its own. The YAML block above is the Hugging Face Space config,
so this folder can be pushed to a Space as-is (see §6).

```
backend/
  agents/            the AI team: no keys, no network, no web framework
    interviewer.py     Hudhud: picks the next move every turn
    story_writer.py    turns a session into a bilingual chapter, never invents facts
    illustrator.py     builds the FLUX.1 schnell request from the writer's scene
    orchestrator.py    hand-off and pipeline: Hudhud → writer → illustrator, with a trace
    guardrails.py      grief / tiredness / private-info cues (EN, Roman Urdu, Urdu), fencing
    types.py           pydantic shapes (camelCase on the wire)
  app/               FastAPI around the agents
    main.py            app, CORS, error handlers, /health
    routes/            agents.py (turn, chapter, illustrate), voice.py (transcribe, tts), share.py
    providers/         gemini.py, cloudflare.py (plain httpx, server-only keys)
    security.py        rate limit + Supabase bearer-token check
    supabase.py        REST calls as the caller (RLS) or as the service role
    painting.py        stores paintings in the private bucket, returns signed URLs
    inputs.py, errors.py, config.py, http_client.py
  tests/             agents, orchestrator and HTTP tests (fake model, no network)
  supabase/migrations/   schema + RLS
  Dockerfile         one image for Hugging Face Spaces, Render, Railway, Koyeb...
```

## 1. Run it locally

```bash
cd backend
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                              # fill in keys; APP_ENV=development
uvicorn app.main:app --env-file .env --reload --port 8000
pytest                                            # 41 tests, no keys needed
```

Then set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`
and run the frontend. `GET /health` shows which providers are connected.

## 2. The agents

**Hudhud decides; the orchestrator runs the team.**

```
          ┌──────────────── POST /api/turn ─────────────────┐
answer ─▶ │ Interviewer: signals → model → rule checks →   │─▶ follow_up / new_topic: next question
          │              retry once with the reason        │
          └──────────────────────────┬──────────────────────┘
                                     │ wrap_up  →  handoff: "story_writer"
          ┌──────────────── POST /api/chapter ──────────────▼┐
          │ Orchestrator: story writer ─(scene)─▶ illustrator │─▶ { chapter, imageUrl, trace }
          └───────────────────────────────────────────────────┘
```

The orchestrator is plain code, not another LLM. Each step has only one correct
next step, so a model there would just add latency and another way to fail. Its
job is the hand-off, passing the writer's scene to the illustrator, and failure
policy: no chapter → honest 502, but a failed painting still keeps the chapter.
It also records a trace of every step (agent, outcome, reason, ms) for an
"agent thinking" panel in the demo.

The prompts ask the model to behave. The agents then check in code that it
actually did:

- **Interviewer.** Before each call it reads the last answer for grief, 1947
  violence or tiredness (English, Roman Urdu, Urdu script) and tells the model.
  `mood: "sensitive"` (from the model or the cue check) turns Hudhud gentle on the
  record screen. Questions asking for phone, CNIC, bank, money or an address,
  two questions at once, or an over-long question are rejected and retried once.
  At 8 answers it wraps up with a fixed thank-you line and doesn't call the
  model. Two failures → `None`; it never writes a question itself.
- **Story writer.** First person, the elder's own phrases, Urdu plus a faithful
  English version, `[unclear]` instead of guesses, 250–500 words only if the
  material is there. A pull quote not found word for word in an elder turn is
  re-pointed to the turn that said it, or dropped. A year never said (Western
  or Urdu digits) is dropped. Source turns must exist. Returns a `scene`.
- **Illustrator.** Fixed gouache style, per-family seed. Graphic scenes are
  swapped for a quiet train or a lantern-lit doorway. Never sees the elder's photo.
- **All of them** fence transcripts between `<<<` and `>>>` as data, and strip
  those markers from answers so an answer can't break out of its fence.

## 3. Routes

| Route | Body | Response |
| --- | --- | --- |
| `POST /api/turn` | `{ elder, theme, turns, skipped? }` | `InterviewerDecision` + `handoff` + `signals` (what Hudhud noticed) + `trace` |
| `POST /api/chapter` | `{ elder, theme, turns, familySeed }` | `{ chapter, imageUrl?, trace }`: the orchestrated hand-off |
| `POST /api/illustrate` | `{ chapter: { title, scene?, year?, place? }, familySeed }` | `{ imageUrl?, trace }`: paints a saved chapter again |
| `POST /api/transcribe` | FormData `{ audio, lang, sessionId? }` | `{ text, audioPath? }`. Gemini, then Whisper as backup; the clip is stored with the caller's token |
| `POST /api/tts` | `{ text, lang }` | `audio/wav`, Hudhud's voice only, cached by text |
| `GET /api/share/{token}` | none | read-only family book (public, service role after the token check) |
| `GET /health` | none | which providers are connected (no secrets) |

Shapes are in `agents/types.py` and mirrored in `frontend/lib/types.ts`.
Bodies are capped (JSON 256 KB, audio 20 MB) and every field is clamped. Turns
keep their original `index` so `sourceTurns` survive clamping. There's no
Vercel 4.5 MB body limit any more, so long answers reach the transcriber.

## 4. Security

- The browser sends the signed-in user's Supabase access token as
  `Authorization: Bearer`. The backend checks it with Supabase Auth
  (`/auth/v1/user`) and caches the result for 60 s. Missing or invalid → `401`.
- No cookies means no CSRF. Instead, `ALLOWED_ORIGINS` (CORS) lists which
  sites may call the API.
- Rate limits, per minute, both per client IP and per account: 30 for turns,
  transcription and voice, 6 for chapters and repaints (the free FLUX quota is ~170 images a
  day), 60 for share reads. The client IP is the hop our own proxy added to
  `X-Forwarded-For` (`TRUSTED_PROXY_HOPS`), never a value the client wrote.
  In memory, so per instance.
- Request bodies are limited while they stream in (256 KB JSON, 21 MB audio), so
  a chunked request with no declared size can't fill memory or disk.
- Uploaded audio is identified from its own bytes (WebM, Ogg, MP4, WAV, MP3) and
  stored under that type; anything else is refused, whatever the browser claims.
- The share read only signs files inside the shared family's own folder.
- Every response carries `nosniff`, `no-store`, no referrer, no framing and a
  deny-all content policy. Docs and OpenAPI are off; errors never echo internals.
- `APP_ENV` defaults to production: without Supabase keys the routes answer
  `503`. Only `APP_ENV=development` lets the API run without accounts on your own machine.
- The service role key is used in exactly two places: the painting upload and
  the share read. Everything the caller owns is written with their own token,
  so row level security decides.

## 5. Error contract

Every route uses the same statuses, because the browser maps them to behavior:

| Status | Meaning | What the browser does |
| --- | --- | --- |
| `200` | Body matches the documented shape | Uses the AI answer |
| `400` | Body failed validation or was oversized | Falls back to the stand-in |
| `401` | Not signed in | Stand-in |
| `429` | Rate limit hit, or the provider's quota | Stand-in; nothing is invented |
| `501` | Provider not configured (key missing) | Stand-in (the demo-mode path) |
| `502` | Provider failed or answered badly | Stand-in; never papered over with generated content |
| `503` | Server not set up (production without keys) | Stand-in |

Error bodies are always `{ "error": "short friendly sentence" }`. Raw provider
errors are logged server-side only and never sent to the client.

## 6. Deploy

**Recommended: Hugging Face Spaces (Docker, free, no card).**
1. huggingface.co → New Space → SDK **Docker** → blank → create (e.g. `baithak-api`).
2. Space → Settings → *Variables and secrets*: add every key from `.env.example`
   as a **secret**. Leave `APP_ENV` unset (production), and set
   `ALLOWED_ORIGINS=https://YOUR-SITE.vercel.app,http://localhost:3000`.
   The image already sets `TRUSTED_PROXY_HOPS=1` for the Space's proxy.
3. Push only this folder to the Space, from the repo root:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR-USER/baithak-api
   git subtree push --prefix backend space main
   ```
4. Open `https://YOUR-USER-baithak-api.hf.space/health`, then set
   `NEXT_PUBLIC_API_URL` to that origin in Vercel and redeploy the frontend.

Free Spaces sleep after about 48 h without traffic. Open `/health` an hour before the demo.

**Alternative: Render.** New Web Service → this repo → Root Directory
`backend` → Runtime Docker → same env vars. The free plan sleeps after 15 minutes
idle and takes about 50 s to wake, which is risky in a live demo unless you open
`/health` just before.

## 7. Database

Schema and RLS: `supabase/migrations/0001_init.sql` (apply with the SQL editor or
`supabase db push`), plus `0002_turn_duration.sql` (turn durations and the
foreign-key indexes the share read filters on) and `0003_hardening.sql` (only
signed-in users may call `owns_family()`, and share tokens must be 24-64 random
characters).

```
families 1─* elders 1─* sessions 1─* turns
                          └──────* chapters
share_links → families        storage: audio/, images/ (private, {family_id}/…)
```

- `owns_family(uuid)` is the single ownership check used by every RLS policy;
  storage policies trust the first folder of the path as the family id.
- There is deliberately **no anon read policy** on chapters; share pages read
  through the service role after the token check.
- The frontend writes families, elders, sessions, turns and chapters itself
  with the user's own session (`frontend/lib/data/remote.ts`, local-first
  dual-write). The backend only adds voice clips and paintings to storage.
- `unclear` and `scene` live on the device copy for now; the `chapters` table
  has no columns for them yet.

## 8. Rules

- Free tiers only. No voice cloning: TTS is only ever Hudhud; the elder's real recordings are kept.
- The story writer never invents facts, and no route papers over a model failure with generated content.
- Never log or return keys or raw provider errors. Validate and clamp everything from the browser;
  treat model output as untrusted JSON.

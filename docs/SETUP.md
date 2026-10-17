# Setup and team guide

An AI agent that interviews grandparents by voice in Urdu and turns their memories into an illustrated family storybook, with their real voice beside every chapter. Built for the NYLP AI Hackathon 2026.

Birdy sits with an elder, asks one gentle question at a time (Urdu + English, spoken aloud), records the answer in their **own voice**, then three agents take over: the interviewer picks the next question, the story writer writes a bilingual chapter **only from what was said**, and the painter illustrates it in one consistent storybook style. Every chapter keeps the real recordings beside the text — that is the proof nothing was invented.

## Run it (Windows, macOS or Linux)

You need Node.js 20 or newer.

```bash
npm install
copy frontend\.env.example frontend\.env.local   # macOS/Linux: cp frontend/.env.example frontend/.env.local
npm run dev
```

Open http://localhost:3000.

**Demo mode:** with no Supabase keys in `.env.local`, sign up just moves you forward and the family book is saved in the browser. Add the keys and real Google + email sign in turns on. Add the Gemini and Cloudflare keys and the AI routes answer for real; until then the app uses honest stand-ins (practice questions, transcript-only drafts) and labels them as such.

**Sound:** night ambience and Birdy's chirps start on your first click (browsers block sound before that). The Sound button turns it off and remembers it.

## Environment variables (`frontend/.env.local`)

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts, database, sharing |
| `GEMINI_API_KEY` | Interviewer (`/api/turn`), writer (`/api/story`), transcription, Birdy's voice (`/api/tts`) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Chapter paintings (`/api/illustrate`, FLUX.1 schnell), Whisper transcription backup |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: image bucket uploads and the public share read |
| `NEXT_PUBLIC_SITE_URL` | WhatsApp/social link previews (set on Vercel) |

Server keys never get a `NEXT_PUBLIC_` prefix and are only read inside `backend/`. Full details, route contracts and the error map: [backend/README.md](../backend/README.md).

**Google sign-in gotcha:** in Google Cloud Console, the OAuth client's *Authorized redirect URI* is `https://PROJECT-REF.supabase.co/auth/v1/callback` (the Supabase one — not localhost), while `http://localhost:3000/auth/callback` goes into Supabase's own URL Configuration.

## Verify

```bash
npm run build       # production build (also generates frontend/next-env.d.ts)
npm run typecheck   # tsc --noEmit in frontend, backend and agents
npm test            # agent tests, no network
```

All pass clean; the build registers all six API routes plus the proxy middleware.
Run the build once before the first typecheck: the image type declarations come
from the generated `next-env.d.ts`.

## Structure

See the root [README](../README.md#structure).

## Who owns what

| Area | Owner |
| --- | --- |
| AI agents and server (`agents/`, `backend/`) | Ayesha |
| Frontend and design (`frontend/`, `frontend/DESIGN.md`) | Faria |
| Database and pitch (`backend/supabase/`) | Humema |

## Rules

- Server keys (Gemini, Cloudflare, Supabase service role, HF) live only in `.env.local` and are read only in `backend/`. Never prefix them with `NEXT_PUBLIC_`.
- No voice cloning. The elder's real recordings only.
- The story writer never invents facts.
- Free tiers only.

## Security checklist (Supabase dashboard, Humema)

Code side is done: `proxy.ts` refreshes logins and guards `/book` and `/onboarding`, every AI route runs a guard (CSRF origin check, per-client rate limit, sign-in), demo mode only works on your own computer, login redirects only go to our own pages, request bodies are size-capped, and security headers are set in `frontend/next.config.ts`.

In the Supabase dashboard:
1. **Authentication → Providers → Email**: keep "Confirm email" ON, set minimum password length to **8**.
2. **Authentication → URL Configuration**: Site URL = your Vercel URL. Redirect URLs = `https://YOUR-SITE.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`. Nothing else.
3. **Authentication → Providers → Google**: enable only after adding the Google OAuth client ID and secret (see the gotcha above).
4. Run `backend/supabase/migrations/0001_init.sql` and `0002_turn_duration.sql` so every table has row level security, and the indexes and turn durations exist.
5. Never put the `service_role` key in any `NEXT_PUBLIC_` variable.

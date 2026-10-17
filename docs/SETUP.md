# Setup and team guide

An AI agent that interviews grandparents by voice in Urdu and turns their memories into an illustrated family storybook, with their real voice beside every chapter. Built for the NYLP AI Hackathon 2026.

Hudhud sits with an elder, asks one gentle question at a time (Urdu + English, spoken aloud), records the answer in their **own voice**, then three agents take over: the interviewer picks the next question, the story writer writes a bilingual chapter **only from what was said**, and the painter illustrates it in one consistent storybook style. Every chapter keeps the real recordings beside the text — that is the proof nothing was invented.

## Run it

See the root [README](../README.md#quick-start): the Python backend on port 8000, then the frontend on 3000.

**Demo mode:** with no Supabase keys, sign up just moves you forward and the family book is saved in the browser. Add the keys and real Google + email sign in turns on. Point `NEXT_PUBLIC_API_URL` at a backend with Gemini and Cloudflare keys and the AI answers for real; until then the app uses honest stand-ins (practice questions, transcript-only drafts) and labels them as such.

**Sound:** night ambience and Hudhud's chirps start on your first click (browsers block sound before that). The Sound button turns it off and remembers it.

## Environment variables

**Frontend** (`frontend/.env.local`, and Vercel):

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts, database, sharing |
| `NEXT_PUBLIC_API_URL` | The backend's origin, e.g. `https://you-baithak-api.hf.space` |
| `NEXT_PUBLIC_SITE_URL` | WhatsApp/social link previews |

**Backend** (`backend/.env`, and the host's secrets): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (same project), `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `ALLOWED_ORIGINS`, `TRUSTED_PROXY_HOPS` (0 locally), and `APP_ENV=development` for local runs only. Details: [backend/README.md](../backend/README.md).

AI and service-role keys exist only on the backend. Nothing secret ever gets a `NEXT_PUBLIC_` prefix.

**Google sign-in gotcha:** in Google Cloud Console, the OAuth client's *Authorized redirect URI* is `https://PROJECT-REF.supabase.co/auth/v1/callback` (the Supabase one — not localhost), while `http://localhost:3000/auth/callback` goes into Supabase's own URL Configuration.

## Verify

```bash
cd backend && pytest   # agents, orchestrator, HTTP
npm run build          # from the repo root; generates frontend/next-env.d.ts
npm run typecheck
```

## Structure

See the root [README](../README.md#structure).

## Who owns what

| Area | Owner |
| --- | --- |
| AI agents and backend (`backend/agents`, `backend/app`) | Ayesha |
| Frontend and design (`frontend/`, `frontend/DESIGN.md`) | Faria |
| Database and pitch (`backend/supabase/`) | Humema |

## Rules

- Server keys (Gemini, Cloudflare, Supabase service role) live only in the backend's env. Never prefix anything secret with `NEXT_PUBLIC_`.
- No voice cloning. The elder's real recordings only.
- The story writer never invents facts.
- Free tiers only.

## Security checklist (Supabase dashboard, Humema)

Code side is done: `frontend/proxy.ts` refreshes logins and guards `/book` and `/onboarding`, every backend AI route runs a guard (CORS allowlist, per-client rate limit, Supabase token check), demo mode only works on your own computer, login redirects only go to our own pages, request bodies are size-capped, and security headers are set in `frontend/next.config.ts`.

In the Supabase dashboard:
1. **Authentication → Providers → Email**: keep "Confirm email" ON, set minimum password length to **8**.
2. **Authentication → URL Configuration**: Site URL = your Vercel URL. Redirect URLs = `https://YOUR-SITE.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`. Nothing else.
3. **Authentication → Providers → Google**: enable only after adding the Google OAuth client ID and secret (see the gotcha above).
4. Run `backend/supabase/migrations/0001_init.sql`, `0002_turn_duration.sql` and `0003_hardening.sql` in order, so every table has row level security, the indexes exist, and share tokens and the ownership check are locked down.
5. Never put the `service_role` key in any `NEXT_PUBLIC_` variable.

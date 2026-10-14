# Yaadon ki Baithak (یادوں کی بیٹھک)

An AI agent that interviews grandparents by voice in Urdu and turns their memories into an illustrated family storybook, with their real voice beside every chapter. Built for the NYLP AI Hackathon 2026.

## Run it (Windows, macOS or Linux)

You need Node.js 20 or newer.

```bash
npm install
copy apps\web\.env.example apps\web\.env.local   # macOS/Linux: cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open http://localhost:3000.

**Demo mode:** with no Supabase keys in `.env.local`, sign up just moves you forward and the family book is saved in the browser. Add the keys and real Google + email sign in turns on.

**Sound:** night ambience and Birdy's chirps start on your first click (browsers block sound before that). The Sound button turns it off and remembers it.

## Structure

```
apps/web                 Next.js 16 app (frontend + API routes)
  app/page.tsx           Home (dusk rooftop)
  app/signup             Sign up / sign in
  app/onboarding         Create the family book (3 steps)
  app/book               Family book dashboard
  app/record             Elder recording room (practice mode for now)
  app/api/*              turn, story, illustrate, tts (stubs, return 501)
  components/            mascots, scene, effects, home, app, stories
  lib/                   supabase clients, sound, themes, sample chapters
packages/agents          Prompts and types for interviewer, story writer, illustrator
supabase/migrations      Database schema with row level security
DESIGN.md                Design system, read before changing UI
```

## Who owns what

| Area | Owner |
| --- | --- |
| AI agents (`packages/agents`, `app/api`) | Ayesha |
| Frontend and design (`apps/web/app`, `components`, `DESIGN.md`) | Faria |
| Database and pitch (`supabase/`) | Humema |

## Rules

- Server keys (Gemini, Cloudflare, Supabase service role, HF) live only in `.env.local` and are read in API routes. Never prefix them with `NEXT_PUBLIC_`.
- No voice cloning. The elder's real recordings only.
- The story writer never invents facts.
- Free tiers only.

## Security checklist (Supabase dashboard, Humema)

Code side is done: `proxy.ts` refreshes logins and guards `/book` and `/onboarding`, demo mode only works on your own computer, login redirects only go to our own pages, and security headers are set in `next.config.ts`.

In the Supabase dashboard:
1. **Authentication → Providers → Email**: keep "Confirm email" ON, set minimum password length to **8**.
2. **Authentication → URL Configuration**: Site URL = your Vercel URL. Redirect URLs = `https://YOUR-SITE.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`. Nothing else.
3. **Authentication → Providers → Google**: only enable after adding the Google OAuth client ID and secret.
4. Run `supabase/migrations/0001_init.sql` so every table has row level security.
5. Never put the `service_role` key in any `NEXT_PUBLIC_` variable.

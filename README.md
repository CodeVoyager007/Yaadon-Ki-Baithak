# Yaadon ki Baithak (یادوں کی بیٹھک)

An AI agent that interviews grandparents by voice in Urdu and turns their memories into an illustrated family storybook, with their real voice beside every chapter. Built for the NYLP AI Hackathon 2026.

**Hudhud is an agent that listens, decides, and hands off to two other agents.** Every turn it picks the next question from what the elder just said, slows down when a memory hurts, and decides when the chapter is ready. Then the story writer turns the session into a bilingual chapter using only the elder's words, and the illustrator paints it.

## Quick start

Two processes: the Python backend (the agents) and the Next.js frontend.

```bash
# 1. Backend — Python 3.11+
cd backend
python -m venv .venv && . .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                # add keys; APP_ENV=development
uvicorn app.main:app --env-file .env --reload --port 8000

# 2. Frontend — Node 20.9+, from the repo root in a second terminal
npm install
cp frontend/.env.example frontend/.env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000. With no backend URL or no keys the app still runs in
demo mode on honest stand-ins (practice questions, transcript-only drafts).

```bash
cd backend && pytest   # 39 tests: agents, orchestrator, HTTP and security; no keys, no network
npm run build          # frontend production build (then npm run typecheck)
```

## Structure

```
frontend/   Next.js 16 (Vercel). Pages, components, browser stores, Supabase auth.
            lib/api.ts is the only door to the backend; lib/types.ts is the contract.
backend/    Python + FastAPI (Docker: Hugging Face Spaces / Render).
  agents/   interviewer (Hudhud), story writer, illustrator, orchestrator. No keys, no I/O.
  app/      routes, auth, rate limit, Gemini/Cloudflare clients, Supabase storage.
  supabase/ migrations: schema + row level security.
docs/       setup and team guide.
```

The browser calls the backend directly (`NEXT_PUBLIC_API_URL`) with the signed-in
user's Supabase access token. The backend checks that token, runs the agents, and
keeps every AI and service-role key. None of them ever reach the frontend.

**Deploy:** backend first (see [backend/README.md §6](./backend/README.md#6-deploy)),
then on Vercel set Root Directory `frontend`, `NEXT_PUBLIC_API_URL` to the backend
URL, and add the Vercel URL to the backend's `ALLOWED_ORIGINS`.

## Read first

| Doc | What it covers |
| --- | --- |
| [docs/SETUP.md](./docs/SETUP.md) | Environment variables, Supabase checklist, team ownership, rules |
| [frontend/DESIGN.md](./frontend/DESIGN.md) | Design system — required reading before touching the UI |
| [backend/README.md](./backend/README.md) | The agents and orchestrator, routes, error contract, auth, deploy, database |

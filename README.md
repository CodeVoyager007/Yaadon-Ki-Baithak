# Yaadon ki Baithak (یادوں کی بیٹھک)

An AI agent that interviews grandparents by voice in Urdu and turns their memories into an illustrated family storybook, with their real voice beside every chapter. Built for the NYLP AI Hackathon 2026.

The whole app lives in [`frontend/`](./frontend) (npm workspaces: a Next.js 16 web app and the `@baithak/agents` prompt package).

## Quick start

```bash
cd frontend
npm install
copy apps\web\.env.example apps\web\.env.local   # macOS/Linux: cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open http://localhost:3000 — it runs in demo mode with no keys, and lights up fully (accounts, AI interviewer, story writer, paintings, sharing) once the keys and Supabase migrations are in place.

## Read first

| Doc | What it covers |
| --- | --- |
| [frontend/README.md](./frontend/README.md) | Setup, environment variables, structure, team ownership |
| [frontend/DESIGN.md](./frontend/DESIGN.md) | Design system — required reading before touching the UI |
| [frontend/BACKEND.md](./frontend/BACKEND.md) | Server architecture: AI routes, auth, database |

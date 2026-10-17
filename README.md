# Yaadon ki Baithak (یادوں کی بیٹھک)

An AI agent that interviews grandparents by voice in Urdu and turns their memories into an illustrated family storybook, with their real voice beside every chapter. Built for the NYLP AI Hackathon 2026.

**Birdy is an agent that listens, decides, and hands off to two other agents.** Every turn it picks the next question from what the elder just said, slows down when a memory hurts, and decides when the chapter is ready. Then the story writer turns the session into a bilingual chapter using only the elder's words, and the illustrator paints it.

## Quick start

You need Node.js 22.18 or newer for the agent tests (the app itself runs on 20.9+). From the repo root:

```bash
npm install
copy frontend\.env.example frontend\.env.local   # macOS/Linux: cp frontend/.env.example frontend/.env.local
npm run dev
```

Open http://localhost:3000 — it runs in demo mode with no keys, and lights up fully (accounts, AI interviewer, story writer, paintings, sharing) once the keys and Supabase migrations are in place.

```bash
npm run build       # production build
npm run typecheck   # all three workspaces (run the build once first)
npm test            # agent tests, no network, no keys
```

## Structure

One npm workspace, three parts, one deployment:

```
frontend/   @baithak/web       Next.js 16 app: pages, components, browser stores, proxy.ts.
                               app/api/* are one-line re-exports of backend handlers.
backend/    @baithak/backend   Route handlers (standard Request/Response), auth + rate-limit
                               guard, Gemini/Cloudflare clients, Supabase admin, migrations.
agents/     @baithak/agents    Interviewer, story writer, illustrator: prompts, output
                               validation, safety rules, retries. No keys, no fetch. Tested.
docs/                          Setup and team guide, raw art assets.
```

Dependencies only point one way: `frontend → backend → agents`. The browser
never imports `backend/` (it calls `/api/*` through `frontend/lib/api.ts`), and
the agents never know which model provider or framework runs them.

**Deploying on Vercel:** set the project's *Root Directory* to `frontend`
(it was `frontend/apps/web` before this layout). Vercel installs the workspace
from the repo root, so `backend/` and `agents/` are included automatically.

## Read first

| Doc | What it covers |
| --- | --- |
| [docs/SETUP.md](./docs/SETUP.md) | Environment variables, Supabase checklist, team ownership, rules |
| [frontend/DESIGN.md](./frontend/DESIGN.md) | Design system — required reading before touching the UI |
| [backend/README.md](./backend/README.md) | Server architecture: routes, error contract, auth, database |
| [agents/README.md](./agents/README.md) | The three agents: what each decides and what code guarantees |

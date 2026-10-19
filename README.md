# Yaadon ki Baithak (یادوں کی بیٹھک)

**An AI agent that sits with your grandparents, listens to their stories in Urdu, and turns
them into an illustrated family storybook, with their real voice inside.**

Built for the **NYLP AI Hackathon 2026**.

| | |
| --- | --- |
| **Live app** | _add the Vercel URL here_ |
| **Demo video** | _add the video link here_ |
| **Team** | Ayesha Mughal (AI agents, backend) · Faria (frontend, design) · Humema (database, pitch) |

---

## The problem

Every family has a Dadi or a Nana with stories nobody wrote down: 1947, the old city, the
wedding, the recipe. They are told in Urdu, out loud, and when the storyteller is gone, the
stories go too. Grandchildren who read English better than Urdu can't follow them, and nobody
has time to sit and transcribe.

## What it does

1. **Hudhud listens.** Hudhud, a hoopoe from Urdu folk tales, asks for consent, then lets the
   elder tell the whole story in one go without interruptions.
2. **Hudhud asks only what's missing.** It reads the story and asks at most three gentle
   questions about what a grandchild couldn't follow (who "he" was, where, when), in Urdu,
   spoken aloud. It notices grief or tiredness and goes softer, or stops.
3. **A line of agents makes the book.** The story writer edits it in the elder's own voice,
   the page setter lays out the pages, the art director plans a picture for each page, and
   the illustrator paints them all in one storybook style.
4. **The family reads it.** It opens as a hardcover book with pages you turn by hand, in Urdu,
   English or both. One button plays the elder telling the whole story in their real voice.
   Families download it as a PDF, share a read-only link on WhatsApp, and keep as many books
   as they like on one shelf.

**Nothing is invented.** The writer may only use what the elder said. Code checks that every
quote was really said and every year was really mentioned, and links every page to the
recording it came from.

## The agents

```
                  ┌──────────── live conversation ────────────┐
  elder's voice ─▶│ Hudhud (interviewer): reads the story,    │─▶ a clarifying question, or "ready"
                  │ asks ≤ 3 questions, notices grief/fatigue │
                  └─────────────────────┬─────────────────────┘
                                        │ hand-off
  ┌──────────────────────────── the book line ───────────────────────────────┐
  │ story writer ─▶ page setter ─▶ art director ─▶ illustrator (in parallel)  │─▶ storybook
  │   (edits)       (layout,        (a brief per     (paints every page)      │
  │                  plain code)     page)                                    │
  └───────────────────────────────────────────────────────────────────────────┘
```

| Agent | Job | Runs on |
| --- | --- | --- |
| Hudhud (interviewer) | Decides every turn: ask, or hand off. Safety checks in code (no money/phone/address questions, one question at a time) | Gemini 2.5 Flash |
| Story writer | Edits the story in the elder's voice, Urdu and English, never adds facts | Gemini 2.5 Flash |
| Page setter | 4 to 8 pages at whole sentences, both languages split at the same points | Plain code |
| Art director | One calm painting brief per page (no faces, nothing graphic) | Gemini 2.5 Flash-Lite |
| Illustrator | Paints every page in one consistent style | Cloudflare Workers AI, FLUX.1 schnell |
| Orchestrator | Hand-offs, fallbacks, and a trace of every step for the "what the agents did" panel | Plain code |

**It never fails the family.** Every step has a fallback. If a model runs out of quota, the
backend tries the next free model and waits out per-minute limits. If the writer still can't
run, the book is made from the elder's own words, still laid out and painted, and a "Write it
properly" button sends it back through the agents later.

## Built with

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Motion. Deployed on Vercel.
- **Backend:** Python, FastAPI. Docker on Hugging Face Spaces.
- **AI:** Google Gemini (interviewer, writer, art director, Urdu transcription, Hudhud's
  voice), Cloudflare Workers AI (FLUX.1 schnell paintings, Whisper as a transcription fallback).
- **Data:** Supabase (auth, Postgres with row level security, private storage for voices
  and paintings).
- **Free tiers only.** No voice cloning: only the elder's real recordings.

## Privacy and safety

- The elder agrees on the record before anything is saved; the consent clip is kept.
- Each family's data is private to its account (row level security on every table; private
  storage with short-lived signed links). Share links are read-only and unguessable.
- AI keys live only on the backend. The browser never sees them.
- The painter only receives short scene briefs, never the elder's words or photo.
- Hudhud never asks for phone numbers, ID cards, bank details or addresses.

## Run it locally

You need Python 3.11+ and Node 20.9+.

```bash
# 1. Backend (the agents)
cd backend
python -m venv .venv && . .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                # add your keys, keep APP_ENV=development
uvicorn app.main:app --env-file .env --reload --port 8000

# 2. Frontend, from the repo root in a second terminal
npm install
cp frontend/.env.example frontend/.env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000. With no keys it still runs in demo mode on clearly labelled
stand-ins.

**Keys:** a free [Gemini API key](https://aistudio.google.com), a free Cloudflare account
(Workers AI), and a free Supabase project. Step-by-step:
[docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md). Check them all with
`cd backend && python -m app.check`, which also shows how much Gemini quota is left today.

**Tests:**

```bash
cd backend && pytest     # 68 tests: agents, page setter, orchestrator, HTTP, security; no keys needed
npm run build            # frontend production build
```

## Deploy

1. **Backend → Hugging Face Spaces** (Docker): [backend/README.md §6](./backend/README.md#6-deploy).
2. **Frontend → Vercel:** Root Directory `frontend`; set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (the Space URL) and
   `NEXT_PUBLIC_SITE_URL`.
3. Add the Vercel URL to the backend's `ALLOWED_ORIGINS` and to Supabase's Auth URL settings.

## Repository

```
frontend/   Next.js app: pages, components, the storybook reader, Supabase auth.
            lib/api.ts is the only door to the backend; lib/types.ts is the contract.
backend/
  agents/   interviewer, story writer, page setter, art director, illustrator, orchestrator.
            No keys, no network: the API hands them a model and a painter.
  app/      FastAPI routes, auth and rate limits, Gemini/Cloudflare/Supabase clients.
  supabase/ database migrations (schema + row level security).
  tests/    pytest suite.
docs/       setup guide, Supabase guide.
```

| Read more | |
| --- | --- |
| [backend/README.md](./backend/README.md) | The agents in detail, routes, error contract, security, deploy |
| [docs/SETUP.md](./docs/SETUP.md) | Environment variables, security checklist, team rules |
| [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) | Supabase from zero: project, SQL, keys, sign-in |
| [frontend/DESIGN.md](./frontend/DESIGN.md) | The design system |

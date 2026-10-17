# @baithak/agents

The three agents that make Baithak. Owner: Ayesha.

```
           ┌──────────── each turn ────────────┐
elder ───▶ │ Interviewer (Birdy)               │ ──▶ follow_up / new_topic: next question
 answers   │  reads signals → asks model →     │
           │  checks rules → retries once      │ ──▶ wrap_up: hand-off ─┐
           └───────────────────────────────────┘                        │
                                                                         ▼
                              Story writer ──▶ Chapter (+ scene) ──▶ Illustrator ──▶ painting
```

| Agent | File | Model | Entry point |
| --- | --- | --- | --- |
| Interviewer | `src/interviewer.ts` | Gemini Flash, JSON mode | `runInterviewer(model, { elder, theme, turns, skipped })` |
| Story writer | `src/story-writer.ts` | Gemini Flash, JSON mode | `runStoryWriter(model, { elder, theme, turns })` |
| Illustrator | `src/illustrator.ts` | FLUX.1 schnell (Cloudflare) | `illustrationRequest(chapter, familySeed)` |

`model` is a `JsonModel`: `(system, user, temperature) => Promise<unknown>`. The
backend passes its Gemini client; tests pass a fake. **No keys, no fetch, no
framework code lives here** — that keeps the agents testable in milliseconds and
lets the backend swap providers without touching a prompt.

## What each agent decides, and what code guarantees

The prompts ask the model to behave. `src/guardrails.ts` and each agent's
`parse…()` make sure it did, because a prompt is a request, not a rule.

**Interviewer** — every turn it chooses `follow_up`, `new_topic` or `wrap_up`,
and a `mood`.
- Before the call it reads signals from the last answer (grief, 1947 violence,
  tiredness — English, Roman Urdu and Urdu script) and the answer count, and
  tells the model. This is the visible "it changed direction because of what
  she said" moment for the demo; `why` carries the model's own reason.
- `mood: "sensitive"` if either the model or the cue check says so: Birdy goes
  gentle, says one kind sentence and offers a lighter topic.
- Rejected and retried once: a question asking for phone, CNIC, bank, money or
  address; two questions at once; an over-long question; missing Urdu/English.
- Hard cap at `MAX_ANSWERS` (8): wraps up with a fixed thank-you line and
  doesn't spend a model call.
- Two failures → `null`. The caller answers 502 and the browser uses its
  practice question. The agent never writes a question itself.

**Story writer** — first person, the elder's own phrases, Urdu + faithful
English, `[unclear]` instead of guesses, 250–500 words only if the material is
there.
- The pull quote is played in the elder's real voice, so it must be word for
  word in an elder turn; otherwise it's re-pointed to the turn that said it, or
  dropped.
- A `year` the elder never said (Western or Urdu digits) is dropped. The
  family's chosen theme counts, so a "1947" session can keep 1947.
- `sourceTurns` must point at real turns; original indexes survive the server
  clamping old turns.
- Returns a `scene` for the illustrator, built only from mentioned details.

**Illustrator** — paints the writer's `scene` in one fixed gouache style with a
per-family seed. Graphic scenes (blood, weapons, riots…) are replaced with a
quiet symbol: a train at a platform for partition stories, a lantern-lit
doorway otherwise. It never receives the elder's photo.

**Everyone:** transcripts are fenced between `<<<` and `>>>`, told to the model
as data, and stripped of those markers so an answer can't close its own fence.

## Run the tests

```bash
npm test -w @baithak/agents     # node --test, no network, no keys
```

The source uses explicit `.ts` import paths and only erasable TypeScript so
Node 22.18+ runs the tests directly with no build step.

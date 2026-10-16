# @baithak/agents

Prompts and types for the three agents. Owner: Ayesha.

- `interviewer.ts`: picks the next question after each answer (Gemini Flash)
- `story-writer.ts`: turns a session into a bilingual chapter, never invents facts (Gemini Flash)
- `illustrator.ts`: FLUX.1 schnell prompt for the chapter painting (Cloudflare Workers AI)

No API calls live here. The web app's `/api/*` routes import these and call the models on the server.

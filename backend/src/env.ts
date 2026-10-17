/**
 * Server-only environment access. Every key here is read inside route
 * handlers and never reaches the browser: nothing in this file may be
 * imported from a component or a "use client" module.
 * Overrides exist for model experiments; the defaults are the free-tier
 * picks documented in backend/README.md.
 */

export const geminiKey = process.env.GEMINI_API_KEY || undefined;
export const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const geminiTtsModel = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

export const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || undefined;
export const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN || undefined;
export const cloudflareImageModel = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
export const cloudflareTranscribeModel = process.env.CLOUDFLARE_TRANSCRIBE_MODEL || "@cf/openai/whisper-large-v3-turbo";

/** False means the matching routes answer 501 and the browser uses its stand-ins. */
export const hasGemini = Boolean(geminiKey);
export const hasCloudflare = Boolean(cloudflareAccountId && cloudflareApiToken);

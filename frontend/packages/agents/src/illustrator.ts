import type { Chapter, IllustrationRequest } from "./types";

/**
 * Illustrator: builds a FLUX.1 schnell prompt (Cloudflare Workers AI, free)
 * for one chapter. Keeps a fixed style so the whole book looks like one artist.
 */
const STYLE =
  "soft gouache storybook painting, warm lantern light, dusk indigo and saffron palette, " +
  "gentle Pixar-like rounded shapes, South Asian setting, no text, no lettering";

const NEGATIVE = "text, letters, watermark, logo, photorealistic faces, gore, weapons, modern phones";

export function illustrationRequest(chapter: Chapter, familySeed: number): IllustrationRequest {
  const where = chapter.place ? ` in ${chapter.place}` : "";
  const when = chapter.year ? `, around ${chapter.year}` : "";
  return {
    prompt: `${chapter.title.en}${where}${when}. ${STYLE}`,
    negativePrompt: NEGATIVE,
    // Same seed per family keeps faces and palette consistent across chapters.
    seed: familySeed,
  };
}

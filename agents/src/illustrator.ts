import type { Chapter, IllustrationRequest } from "./types.ts";
import { normalize } from "./guardrails.ts";

/**
 * Illustrator agent: builds a FLUX.1 schnell request (Cloudflare Workers AI,
 * free) for one chapter, from the story writer's scene. Keeps a fixed style so
 * the whole book looks like one artist. It never sees the elder's photo.
 */
export const STYLE =
  "warm gouache storybook illustration, soft evening lantern light, dusk indigo and saffron palette, " +
  "gentle rounded shapes, South Asian setting, gentle colors, no text in the image";

export const NEGATIVE = "text, letters, watermark, logo, photorealistic faces, recognizable people, gore, blood, weapons, violence, modern phones";

/** Words that would make a painting graphic. 1947 stories get a quiet symbol instead. */
const GRAPHIC = ["blood", "corpse", "dead body", "killed", "murder", "massacre", "weapon", "gun", "sword", "knife", "fire", "burning", "riot", "violence"];

/** Calm stand-in scenes, used when the writer gave no scene or one that isn't safe to paint. */
const QUIET_SCENE = {
  journey: "an old steam train waiting at a quiet railway platform at dusk, a single lantern glowing",
  home: "an old wooden doorway of a courtyard house at dusk, a lantern glowing beside it",
};

function isGraphic(scene: string): boolean {
  const t = ` ${normalize(scene)} `;
  return GRAPHIC.some((w) => t.includes(` ${w} `));
}

/** The scene to paint: the writer's own when it's safe, else a quiet symbol that fits the story. */
export function sceneFor(chapter: Pick<Chapter, "scene" | "title" | "year">): string {
  const scene = chapter.scene?.trim();
  if (scene && !isGraphic(scene)) return scene;
  const partition = chapter.year?.includes("1947") || /1947|partition|train/i.test(chapter.title.en);
  return partition ? QUIET_SCENE.journey : scene ? QUIET_SCENE.home : chapter.title.en || QUIET_SCENE.home;
}

export function illustrationRequest(chapter: Pick<Chapter, "scene" | "title" | "year" | "place">, familySeed: number): IllustrationRequest {
  const where = chapter.place ? `, in ${chapter.place}` : "";
  const when = chapter.year ? `, around ${chapter.year}` : "";
  return {
    prompt: `${sceneFor(chapter)}${where}${when}. ${STYLE}`,
    negativePrompt: NEGATIVE,
    // Same seed per family keeps faces and palette consistent across chapters.
    seed: familySeed,
    steps: 4,
    guidance: 3.5,
    width: 1024,
    height: 1024,
  };
}

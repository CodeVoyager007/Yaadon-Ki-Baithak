/**
 * Every story as storybook pages, whatever it was saved as: the writer's pages
 * when it made them, otherwise the body cut at paragraph breaks (older
 * chapters and transcript drafts). Each page gets its own painting, or a
 * themed picture when none was painted.
 */
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import type { StoredChapter } from "./chapter-store";
import type { Page } from "./types";

export const MAX_PAGES = 8;

export type BookPage = Page & {
  /** The painting for this page: a URL, an "idb:" reference, or the fallback. */
  image: string;
  /** Shown if the painting fails to load (an expired link, say). */
  fallback: string;
};

const SCENES = Object.keys(SCENE_IMAGES) as StoredChapter["scene"][];

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Cut a plain body into at most MAX_PAGES pages at paragraph breaks. */
export function pagesFromBody(ur: string, en: string): Page[] {
  const u = paragraphs(ur);
  const e = paragraphs(en);
  const count = Math.max(u.length, e.length);
  if (!count) return [];
  const per = Math.ceil(count / MAX_PAGES);
  const pages: Page[] = [];
  for (let i = 0; i < count; i += per) {
    pages.push({ ur: u.slice(i, i + per).join("\n\n"), en: e.slice(i, i + per).join("\n\n"), sourceTurns: [] });
  }
  return pages;
}

/** The theme's own picture first, then the other painted scenes in turn, so pages don't all look alike. */
function fallbackFor(stored: StoredChapter, i: number) {
  const start = Math.max(0, SCENES.indexOf(stored.scene));
  return SCENE_IMAGES[SCENES[(start + i) % SCENES.length]].src;
}

export function bookPages(stored: StoredChapter): BookPage[] {
  const c = stored.chapter;
  const pages = c.pages?.length ? c.pages : pagesFromBody(c.body.ur, c.body.en);
  return pages.map((p, i) => {
    const fallback = fallbackFor(stored, i);
    const painted = stored.pageImages?.[i] ?? (i === 0 && !stored.pageImages ? stored.imageUrl : undefined);
    return { ...p, image: painted || fallback, fallback };
  });
}

/** The cover: the book's own cover painting, else its first page's, else the theme's picture. */
export function coverImage(stored: StoredChapter) {
  return stored.imageUrl ?? stored.pageImages?.find(Boolean) ?? SCENE_IMAGES[stored.scene].src;
}

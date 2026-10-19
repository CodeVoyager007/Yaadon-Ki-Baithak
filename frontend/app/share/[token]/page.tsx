"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { BirdySays } from "@/components/app/SpeechBubble";
import { BehindTheStory } from "@/components/book/BehindTheStory";
import { BookCover } from "@/components/book/BookCover";
import { StoryBook } from "@/components/book/StoryBook";
import { Wordmark } from "@/components/brand/Wordmark";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { NightSky } from "@/components/scene/NightSky";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { elderLabel, loadBook, type FamilyBook, type Language, type Relation, type Theme } from "@/lib/book-store";
import { listChapters, type StoredChapter } from "@/lib/chapter-store";
import { apiUrl, hasBackend } from "@/lib/api";
import { THEMES } from "@/lib/themes";

/**
 * Read-only family book for relatives who open a shared link.
 * The backend checks the token against share_links (revoked or expired
 * links die there) and serves the book from the database, so the link works
 * on any device. When that isn't set up, the page falls back to the copy
 * saved on this device, which keeps the local demo flowing.
 */

/** What GET /api/share/[token] returns. */
type SharedTurn = { index: number; role: string; text: string; lang: string; durationMs?: number; at: string };
type SharedChapter = {
  id: string;
  sessionId: string;
  elderId: string;
  theme: string;
  createdAt: string;
  chapter: StoredChapter["chapter"];
  turns: SharedTurn[];
  imageUrl?: string;
  pageImages?: (string | null)[];
};
type SharedBook = {
  familyName: string;
  elders: { id: string; name: string; relation: string; language: string }[];
  chapters: SharedChapter[];
};

/** A chapter without its own painting shows its topic's scene, like the demo does. */
function sceneFor(theme: string): StoredChapter["scene"] {
  return THEMES.find((t) => t.id === theme)?.scene ?? "doorway";
}

export default function SharePage() {
  const params = useParams<{ token?: string | string[] }>();
  const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] ?? "" : "";
  const [book, setBook] = useState<FamilyBook | null | undefined>(undefined);
  const [chapters, setChapters] = useState<StoredChapter[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setBook(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // First choice: the server, which validates the token and reads the book.
      try {
        if (!hasBackend) throw new Error("no backend");
        const res = await fetch(apiUrl(`/api/share/${encodeURIComponent(token)}`));
        if (res.ok) {
          const data = (await res.json()) as SharedBook;
          if (cancelled) return;
          setBook({
            familyName: data.familyName,
            elders: data.elders.map((e) => ({
              id: e.id,
              name: e.name,
              relation: e.relation as Relation,
              language: e.language as Language,
            })),
            theme: "Free talk",
            createdAt: new Date(0).toISOString(),
            shareToken: token,
          });
          setChapters(
            data.chapters.map((c) => ({
              id: c.id,
              sessionId: c.sessionId,
              elderId: c.elderId,
              theme: (THEMES.some((t) => t.id === c.theme) ? c.theme : "Free talk") as Theme,
              scene: sceneFor(c.theme),
              createdAt: c.createdAt,
              chapter: c.chapter,
              turns: c.turns.map((t) => ({
                index: t.index,
                role: t.role === "elder" ? "elder" : "birdy",
                text: t.text,
                lang: t.lang === "en" ? "en" : "ur",
                durationMs: t.durationMs,
                at: t.at,
              })),
              imageUrl: c.imageUrl,
              pageImages: c.pageImages,
            })),
          );
          return;
        }
      } catch {
        /* fall through to the copy on this device */
      }
      if (cancelled) return;
      // Fallback: the book saved on this device (local demo, sharer's phone).
      const b = loadBook();
      const ok = b?.shareToken && b.shareToken === token;
      setBook(ok ? b : null);
      if (ok) setChapters(listChapters());
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const opened = chapters.find((c) => c.id === open) ?? null;
  const elderOf = (id: string) => book?.elders.find((e) => e.id === id) ?? null;

  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden text-moon">
      <NightSky full={false} skyline="dim" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pt-7">
        <Wordmark tone="night" />
        <SoundToggle tone="night" />
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-10">
        {book === undefined && <PixelLantern size={56} className="mx-auto mt-24" />}

        {book === null && (
          <div className="mx-auto max-w-xl">
            <BirdySays>This family book isn&apos;t available. The link may have been turned off.</BirdySays>
            <Link href="/" className="btn-lantern pixel-corners mt-6 inline-flex h-12 items-center px-6 font-extrabold">
              What is Baithak?
            </Link>
          </div>
        )}

        {book && opened && (
          <>
            <button type="button" onClick={() => setOpen(null)} className="mb-6 inline-flex items-center gap-1.5 font-bold text-lantern-soft hover:underline">
              <ArrowLeft size={16} /> All storybooks
            </button>
            <StoryBook stored={opened} elder={elderOf(opened.elderId)} family={book.familyName} />
            <BehindTheStory stored={opened} who={elderOf(opened.elderId) ? elderLabel(elderOf(opened.elderId)!) : "the storyteller"} />
          </>
        )}

        {book && !opened && (
          <>
            <div className="text-center">
              <p className="font-urdu text-2xl text-lantern-soft" dir="rtl" lang="ur">
                یادوں کی بیٹھک
              </p>
              <h1 className="font-display mt-2 text-4xl leading-tight sm:text-6xl">{book.familyName}</h1>
              <p className="mt-3 text-moon/75">
                Told by {book.elders.map((e) => elderLabel(e)).join(", ")}. {chapters.length} {chapters.length === 1 ? "storybook" : "storybooks"}.
              </p>
            </div>
            {chapters.length === 0 ? (
              <p className="glass-night mx-auto mt-10 max-w-md rounded-2xl p-6 text-center text-moon/75">The first storybook is still being recorded.</p>
            ) : (
              <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {chapters.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setOpen(c.id)} className="block w-full rounded-[14px] text-left focus-visible:outline-4 focus-visible:outline-lantern">
                      <BookCover stored={c} teller={elderOf(c.elderId) ? elderLabel(elderOf(c.elderId)!) : "Storyteller"} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-14 text-center text-sm text-moon/55">
              Made with{" "}
              <Link href="/" className="font-bold text-lantern-soft hover:underline">
                Baithak
              </Link>
              : every elder is a library.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

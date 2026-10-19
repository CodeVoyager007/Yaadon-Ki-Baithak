"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Pencil, Sparkles, Trash2 } from "lucide-react";
import { AppBackdrop } from "@/components/app/AppBackdrop";
import { AppHeader } from "@/components/app/AppHeader";
import { BookNav } from "@/components/app/BookNav";
import { BirdySays } from "@/components/app/SpeechBubble";
import { BehindTheStory } from "@/components/book/BehindTheStory";
import { StoryBook } from "@/components/book/StoryBook";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { illustrateOnly } from "@/lib/api";
import { deleteClips } from "@/lib/audio-store";
import { bookPages } from "@/lib/book-pages";
import { elderLabel, getElder, loadBook, type Elder } from "@/lib/book-store";
import { deleteImages, keepImage } from "@/lib/image-store";
import type { Page } from "@/lib/types";
import { removeChapterRemote } from "@/lib/data/remote";
import { deleteChapter, getChapter, saveChapter, type StoredChapter } from "@/lib/chapter-store";

export default function ChapterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [stored, setStored] = useState<StoredChapter | null | undefined>(undefined);
  const [elder, setElder] = useState<Elder | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [painting, setPainting] = useState(false);
  const [paintNote, setPaintNote] = useState<string | null>(null);

  /** Paints every page again. A page whose new painting fails keeps the one it had. */
  async function handleNewPictures() {
    if (!stored || painting) return;
    setPainting(true);
    setPaintNote(null);
    const resting = "The painter is taking a rest right now. The book keeps its pictures.";
    try {
      // Older books get their pages written down first, so each one can be painted.
      const pages: Page[] = bookPages(stored).map(({ ur, en, scene, sourceTurns }) => ({ ur, en, scene, sourceTurns }));
      const chapter = { ...stored.chapter, pages };
      const res = await illustrateOnly(chapter, Math.floor(Math.random() * 1000000));
      const fresh = await Promise.all((res.pageImages ?? []).map((u) => keepImage(u)));
      if (fresh.some(Boolean)) {
        const pageImages = pages.map((_, i) => fresh[i] ?? stored.pageImages?.[i] ?? null);
        const next: StoredChapter = { ...stored, chapter, pageImages, imageUrl: (await keepImage(res.imageUrl)) ?? pageImages.find(Boolean) ?? stored.imageUrl };
        saveChapter(next);
        setStored(next);
        setPaintNote(`Hudhud painted ${fresh.filter(Boolean).length} new pictures for this book!`);
      } else {
        const why = res.trace?.find((t) => t.agent === "illustrator" || t.agent === "orchestrator")?.detail;
        setPaintNote(why ? `${resting} (${why})` : resting);
      }
    } catch {
      setPaintNote(resting);
    } finally {
      setPainting(false);
    }
  }

  // The tab shows the book's own title, so several open books can be told apart.
  useEffect(() => {
    const title = stored?.chapter.title.en || stored?.chapter.title.ur;
    if (title) document.title = `${title} | Baithak`;
  }, [stored]);

  useEffect(() => {
    const c = getChapter(id);
    setStored(c);
    if (c) setElder(getElder(c.elderId));
  }, [id]);

  if (stored === undefined) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <AppBackdrop />
        <PixelLantern size={56} />
        <BookNav />
      </div>
    );
  }

  if (stored === null) {
    return (
      <div className="relative min-h-[100svh]">
        <AppBackdrop />
        <AppHeader back={{ href: "/book", label: "Family book" }} />
        <main className="mx-auto max-w-2xl px-5 pt-16">
          <BirdySays as="h1">I can&apos;t find that storybook on this device.</BirdySays>
          <Link href="/book" className="btn-lantern pixel-corners mt-6 inline-flex h-12 items-center px-6 font-extrabold">
            Back to the family book
          </Link>
        </main>
        <BookNav />
      </div>
    );
  }

  async function remove() {
    if (!stored) return;
    // Local, then let the family's own token clear the cloud copy too
    // (chapter, session, turns and the voice clips in the private bucket).
    deleteChapter(stored.id);
    void removeChapterRemote(stored, loadBook()?.id);
    await deleteClips(stored.turns.map((t) => t.clipId).filter((x): x is string => Boolean(x)));
    await deleteImages([stored.imageUrl, ...(stored.pageImages ?? [])]);
    router.push("/book");
  }

  return (
    <div className="relative min-h-[100svh]">
      <AppBackdrop />
      <AppHeader back={{ href: "/book", label: "Family book" }}>
        {!editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewPictures}
              disabled={painting}
              aria-label="Paint new pictures for every page"
              className="glass-night inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon hover:bg-white/15 disabled:opacity-50"
            >
              <Sparkles size={15} className={painting ? "animate-spin text-lantern" : "text-lantern-soft"} />
              <span className="hidden sm:inline">{painting ? "Painting..." : "New pictures"}</span>
            </button>
            <Link
              href={`/book/print?chapter=${stored.id}`}
              aria-label="Download this storybook as a PDF"
              className="glass-night inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon hover:bg-white/15"
            >
              <Download size={15} />
              <span className="hidden sm:inline">PDF</span>
            </Link>
            <button
              type="button"
              onClick={() => setEditing(true)}
              // New paintings land on the pages as they are now; editing meanwhile would be overwritten.
              disabled={painting}
              title={painting ? "Wait for the new pictures first" : undefined}
              className="glass-night inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon hover:bg-white/15 disabled:opacity-50"
            >
              <Pencil size={15} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        )}
      </AppHeader>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">
        <h1 className="sr-only">{stored.chapter.title.en || stored.chapter.title.ur}</h1>
        {paintNote && (
          <div className="glass-night mb-6 flex items-center justify-between rounded-2xl px-5 py-3 text-sm text-moon/90">
            <p>{paintNote}</p>
            <button type="button" onClick={() => setPaintNote(null)} className="ml-3 text-xs text-moon/60 hover:text-moon">
              ✕
            </button>
          </div>
        )}

        {painting && (
          <div className="glass-night mb-6 flex items-center justify-center gap-3 rounded-2xl p-4 text-moon/90">
            <PixelLantern size={28} />
            <span className="font-display">Hudhud is painting every page again...</span>
          </div>
        )}

        {editing ? (
          <EditChapter
            stored={stored}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              saveChapter(next);
              setStored(next);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <StoryBook stored={stored} elder={elder} family={loadBook()?.familyName} />
            <BehindTheStory stored={stored} who={elder ? elderLabel(elder) : "the storyteller"} />
          </>
        )}

        {!editing && (
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <Link href="/book" className="font-bold text-lantern-soft hover:underline">
              Back to the family book
            </Link>
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-moon/80">Delete this storybook and its recordings for good?</span>
                <button type="button" onClick={remove} className="h-10 rounded-full bg-terracotta px-4 text-sm font-bold text-moon hover:bg-ajrak">
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-full px-4 text-sm font-bold text-moon/80 hover:text-moon">
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon/60 hover:text-terracotta"
              >
                <Trash2 size={15} /> Delete storybook
              </button>
            )}
          </div>
        )}
      </main>
      <BookNav />
    </div>
  );
}

/** Families fix what the AI misheard: a name, a place, a year. Page by page, so the book keeps its shape. */
function EditChapter({ stored, onSave, onCancel }: { stored: StoredChapter; onSave: (c: StoredChapter) => void; onCancel: () => void }) {
  const c = stored.chapter;
  const [titleEn, setTitleEn] = useState(c.title.en);
  const [titleUr, setTitleUr] = useState(c.title.ur);
  const [pages, setPages] = useState<Page[]>(() => bookPages(stored).map(({ ur, en, scene, sourceTurns }) => ({ ur, en, scene, sourceTurns })));
  const setPage = (i: number, patch: Partial<Page>) => setPages((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const input = "mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-moon focus:border-lantern focus:outline-none";

  function save() {
    // A page emptied in the editor is removed, and its painting goes with it so pictures stay on their pages.
    const kept = pages.map((p, i) => ({ p: { ...p, ur: p.ur.trim(), en: p.en.trim() }, i })).filter(({ p }) => p.ur || p.en);
    const clean = kept.map(({ p }) => p);
    onSave({
      ...stored,
      pageImages: stored.pageImages ? kept.map(({ i }) => stored.pageImages?.[i] ?? null) : undefined,
      chapter: {
        ...c,
        title: { en: titleEn.trim(), ur: titleUr.trim() },
        pages: clean,
        body: { ur: clean.map((p) => p.ur).filter(Boolean).join("\n\n"), en: clean.map((p) => p.en).filter(Boolean).join("\n\n") },
      },
    });
  }

  return (
    <section className="glass-night rounded-[32px] p-6 sm:p-9">
      <h1 className="font-display text-3xl text-moon">Edit storybook</h1>
      <p className="mt-1 text-moon/65">Fix anything Hudhud misheard. The original recordings stay exactly as they were.</p>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-moon">Title (English)</span>
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value.slice(0, 120))} className={`${input} font-display text-xl`} />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-moon">Title (Urdu)</span>
          <input value={titleUr} onChange={(e) => setTitleUr(e.target.value.slice(0, 120))} dir="rtl" lang="ur" className={`${input} font-urdu text-xl leading-[2]`} />
        </label>
      </div>
      <ol className="mt-8 space-y-6">
        {pages.map((p, i) => (
          <li key={i} className="rounded-[24px] bg-white/5 p-5">
            <p className="font-pixel text-sm text-lantern">Page {i + 1}</p>
            <div className="mt-2 grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-moon">Urdu</span>
                <textarea value={p.ur} onChange={(e) => setPage(i, { ur: e.target.value })} rows={5} dir="rtl" lang="ur" className={`${input} font-urdu text-lg leading-[2.2]`} />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-moon">English</span>
                <textarea value={p.en} onChange={(e) => setPage(i, { en: e.target.value })} rows={5} className={`${input} font-display text-lg leading-[1.8]`} />
              </label>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="h-12 rounded-2xl px-5 font-bold text-moon/80 hover:text-moon">
          Cancel
        </button>
        <button type="button" onClick={save} className="btn-lantern pixel-corners h-12 px-7 font-extrabold">
          Save changes
        </button>
      </div>
    </section>
  );
}

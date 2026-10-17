"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { AppBackdrop } from "@/components/app/AppBackdrop";
import { AppHeader } from "@/components/app/AppHeader";
import { BookNav } from "@/components/app/BookNav";
import { BirdySays } from "@/components/app/SpeechBubble";
import { ChapterView } from "@/components/app/ChapterView";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { illustrateOnly } from "@/lib/api";
import { deleteClips } from "@/lib/audio-store";
import { getElder, loadBook, type Elder } from "@/lib/book-store";
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

  async function handleNewPicture() {
    if (!stored || painting) return;
    setPainting(true);
    setPaintNote(null);
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const res = await illustrateOnly(stored.chapter, seed);
      if (res.imageUrl) {
        const next: StoredChapter = { ...stored, imageUrl: res.imageUrl };
        saveChapter(next);
        setStored(next);
        setPaintNote("Hudhud painted a new picture for this chapter!");
      } else {
        const next: StoredChapter = { ...stored, imageUrl: undefined };
        saveChapter(next);
        setStored(next);
        setPaintNote("The painter is taking a rest right now. Hudhud kept the theme picture.");
      }
    } catch {
      const next: StoredChapter = { ...stored, imageUrl: undefined };
      saveChapter(next);
      setStored(next);
      setPaintNote("The painter is taking a rest right now. Hudhud kept the theme picture.");
    } finally {
      setPainting(false);
    }
  }

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
          <BirdySays>I can&apos;t find that chapter on this device.</BirdySays>
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
              onClick={handleNewPicture}
              disabled={painting}
              className="glass-night inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon hover:bg-white/15 disabled:opacity-50"
            >
              <Sparkles size={15} className={painting ? "animate-spin text-lantern" : "text-lantern-soft"} />
              <span>{painting ? "Painting..." : "New picture"}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="glass-night inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon hover:bg-white/15"
            >
              <Pencil size={15} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        )}
      </AppHeader>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
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
            <span className="font-display">Hudhud is painting a new scene...</span>
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
          <ChapterView stored={stored} elder={elder} />
        )}

        {!editing && (
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <Link href="/book" className="font-bold text-lantern-soft hover:underline">
              Back to the family book
            </Link>
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-moon/80">Delete this chapter and its recordings for good?</span>
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
                <Trash2 size={15} /> Delete chapter
              </button>
            )}
          </div>
        )}
      </main>
      <BookNav />
    </div>
  );
}

/** Families fix what the AI misheard: a name, a place, a year. */
function EditChapter({ stored, onSave, onCancel }: { stored: StoredChapter; onSave: (c: StoredChapter) => void; onCancel: () => void }) {
  const c = stored.chapter;
  const [titleEn, setTitleEn] = useState(c.title.en);
  const [titleUr, setTitleUr] = useState(c.title.ur);
  const [bodyUr, setBodyUr] = useState(c.body.ur);
  const [bodyEn, setBodyEn] = useState(c.body.en);

  const input = "mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-moon focus:border-lantern focus:outline-none";

  return (
    <section className="glass-night rounded-[32px] p-6 sm:p-9">
      <h1 className="font-display text-3xl text-moon">Edit chapter</h1>
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
        <label className="block">
          <span className="text-sm font-bold text-moon">Story (Urdu)</span>
          <textarea value={bodyUr} onChange={(e) => setBodyUr(e.target.value)} rows={12} dir="rtl" lang="ur" className={`${input} font-urdu text-lg leading-[2.2]`} />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-moon">Story (English)</span>
          <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={12} className={`${input} font-display text-lg leading-[1.8]`} />
        </label>
      </div>
      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="h-12 rounded-2xl px-5 font-bold text-moon/80 hover:text-moon">
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({
              ...stored,
              chapter: { ...c, title: { en: titleEn.trim(), ur: titleUr.trim() }, body: { ur: bodyUr.trim(), en: bodyEn.trim() } },
            })
          }
          className="btn-lantern pixel-corners h-12 px-7 font-extrabold"
        >
          Save changes
        </button>
      </div>
    </section>
  );
}

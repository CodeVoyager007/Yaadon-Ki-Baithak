"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";
import { BirdySays } from "@/components/app/SpeechBubble";
import { ChapterView } from "@/components/app/ChapterView";
import { Wordmark } from "@/components/brand/Wordmark";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { NightSky } from "@/components/scene/NightSky";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { elderLabel, loadBook, type FamilyBook } from "@/lib/book-store";
import { listChapters, voiceLength, type StoredChapter } from "@/lib/chapter-store";

/**
 * Read-only family book for relatives who open a shared link.
 * Until Humema's share_links table is live, this reads the book saved on
 * this device; the server version checks the token and that sharing wasn't turned off.
 */
export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [book, setBook] = useState<FamilyBook | null | undefined>(undefined);
  const [chapters, setChapters] = useState<StoredChapter[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const b = loadBook();
    const ok = b?.shareToken && b.shareToken === token;
    setBook(ok ? b : null);
    if (ok) setChapters(listChapters());
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
              <ArrowLeft size={16} /> All chapters
            </button>
            <ChapterView stored={opened} elder={elderOf(opened.elderId)} />
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
                Told by {book.elders.map((e) => elderLabel(e)).join(", ")}. {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}.
              </p>
            </div>
            {chapters.length === 0 ? (
              <p className="glass-night mx-auto mt-10 max-w-md rounded-2xl p-6 text-center text-moon/75">The first chapter is still being recorded.</p>
            ) : (
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setOpen(c.id)}
                    className="group overflow-hidden rounded-[28px] p-[6px] text-left transition hover:-translate-y-0.5"
                    style={AJRAK_BORDER}
                  >
                    <div className="overflow-hidden rounded-[23px] bg-dusk">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.imageUrl ?? SCENE_IMAGES[c.scene].src} alt="" className="h-48 w-full object-cover" />
                      <div className="p-5">
                        <h2 className="font-display text-2xl leading-tight">{c.chapter.title.en}</h2>
                        <p className="font-urdu mt-1 text-xl leading-[1.9] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
                          {c.chapter.title.ur}
                        </p>
                        <p className="mt-1 text-sm text-moon/65">
                          {elderOf(c.elderId) ? elderLabel(elderOf(c.elderId)!) : "Storyteller"}, {voiceLength(c.turns)} of voice
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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

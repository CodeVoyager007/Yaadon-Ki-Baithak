"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { elderLabel, loadBook, type FamilyBook } from "@/lib/book-store";
import { listChapters, voiceLength, type StoredChapter } from "@/lib/chapter-store";
import { syncBook } from "@/lib/data/sync";

export default function PrintPage() {
  return (
    <Suspense>
      <PrintBook />
    </Suspense>
  );
}

function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

function longDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The family book laid out as paper pages: a cover, then one chapter per
 * page, Urdu and English. The browser's print window saves it as a PDF,
 * which keeps the Nastaliq shaped properly (PDF libraries can't).
 * `?chapter=<id>` prints a single chapter.
 */
function PrintBook() {
  const params = useSearchParams();
  const [book, setBook] = useState<FamilyBook | null | undefined>(undefined);
  const [chapters, setChapters] = useState<StoredChapter[]>([]);
  const printed = useRef(false);
  const only = params.get("chapter");

  useEffect(() => {
    let live = true;
    void syncBook(4000).then(() => {
      if (!live) return;
      const all = listChapters().reverse(); // oldest first, like a book
      setBook(loadBook());
      setChapters(only ? all.filter((c) => c.id === only) : all);
    });
    return () => {
      live = false;
    };
  }, [only]);

  // Open the save-as-PDF window once the fonts and paintings are ready.
  useEffect(() => {
    if (!book || !chapters.length || printed.current) return;
    printed.current = true;
    let live = true;
    const images = [...document.querySelectorAll<HTMLImageElement>(".print-book img")];
    const loaded = images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((r) => {
            img.addEventListener("load", r, { once: true });
            img.addEventListener("error", r, { once: true });
          }),
    );
    const timeout = new Promise((r) => setTimeout(r, 8000));
    void Promise.race([Promise.all([document.fonts.ready, ...loaded]), timeout]).then(() => live && window.print());
    return () => {
      live = false;
    };
  }, [book, chapters]);

  if (book === undefined) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <PixelLantern size={56} />
      </div>
    );
  }

  const elderOf = (id: string) => book?.elders.find((e) => e.id === id) ?? null;
  const tellers = [...new Set(chapters.map((c) => elderOf(c.elderId)).filter(Boolean).map((e) => elderLabel(e!)))];
  const coverFallback = chapters[0] ? SCENE_IMAGES[chapters[0].scene].src : null;
  const coverImg = chapters[0]?.imageUrl ?? coverFallback;

  return (
    <div className="min-h-[100svh] bg-[#2b2d5c] pb-16 print:bg-white print:pb-0">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[#12133a]/95 px-5 py-3 backdrop-blur print:hidden">
        <Link href={only ? `/book/chapter/${only}` : "/book"} className="inline-flex items-center gap-2 text-sm font-bold text-moon/80 hover:text-moon">
          <ArrowLeft size={16} /> Back
        </Link>
        <p className="text-sm text-moon/70">In the print window, choose &ldquo;Save as PDF&rdquo;.</p>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!chapters.length}
          className="btn-lantern pixel-corners inline-flex h-11 items-center gap-2 px-5 font-extrabold disabled:opacity-50"
        >
          <Download size={17} /> Save as PDF
        </button>
      </div>

      {!book || !chapters.length ? (
        <p className="mx-auto mt-24 max-w-md px-5 text-center text-moon/80">
          {book ? "There are no chapters to print yet. Record a story first." : "We couldn't find a family book on this device."}
        </p>
      ) : (
        <div className="print-book mx-auto mt-8 flex max-w-[210mm] flex-col gap-8 px-3 text-[#24160e] print:mt-0 print:max-w-none print:gap-0 print:px-0">
          {!only && (
            <section className="print-page print-cover flex min-h-[287mm] flex-col items-center justify-center rounded-md bg-[#fbf3e4] px-10 py-14 text-center shadow-2xl">
              <p className="font-urdu text-4xl leading-[2.2] text-[#9e2b25]" dir="rtl" lang="ur">
                یادوں کی بیٹھک
              </p>
              <h1 className="font-display mt-4 text-5xl leading-tight">{book.familyName}</h1>
              <p className="mt-3 text-lg text-[#5a4636]">A family book of remembered stories</p>
              {coverImg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImg}
                  alt=""
                  onError={(e) => {
                    if (coverFallback && !e.currentTarget.src.endsWith(coverFallback)) e.currentTarget.src = coverFallback;
                  }}
                  className="mt-10 aspect-[4/3] w-full max-w-md rounded-md object-cover"
                />
              )}
              <p className="mt-10 text-base text-[#5a4636]">
                {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
                {tellers.length ? `, told by ${tellers.join(", ")}` : ""}
              </p>
              <p className="mt-1 text-sm text-[#7a5a3a]">{longDate(new Date().toISOString())}</p>
            </section>
          )}

          {chapters.map((c) => (
            <PrintChapter key={c.id} stored={c} teller={elderOf(c.elderId) ? elderLabel(elderOf(c.elderId)!) : "Their storyteller"} family={book.familyName} />
          ))}
        </div>
      )}
    </div>
  );
}

function PrintChapter({ stored, teller, family }: { stored: StoredChapter; teller: string; family: string }) {
  const { chapter } = stored;
  const ur = paragraphs(chapter.body.ur);
  const en = paragraphs(chapter.body.en);
  const fallback = SCENE_IMAGES[stored.scene].src;

  return (
    <article className="print-page rounded-md bg-[#fbf3e4] px-10 py-12 shadow-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stored.imageUrl ?? fallback}
        alt=""
        onError={(e) => {
          if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback;
        }}
        className="aspect-[16/9] w-full rounded-md object-cover"
      />
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-3xl leading-tight">{chapter.title.en}</h2>
        {chapter.year && <span className="font-display text-lg text-[#9e2b25]">{chapter.year}</span>}
      </div>
      {chapter.title.ur && (
        <p className="font-urdu mt-1 text-2xl leading-[2] text-[#9e2b25]" dir="rtl" lang="ur">
          {chapter.title.ur}
        </p>
      )}
      <p className="mt-1 text-sm text-[#5a4636]">
        Told by {teller}
        {chapter.place ? `, ${chapter.place}` : ""}. Recorded {longDate(stored.createdAt)}. {voiceLength(stored.turns)} of voice.
        {stored.draft ? " Draft: the transcript, word for word." : ""}
      </p>

      {chapter.pullQuote && (
        <blockquote className="my-6 border-s-4 border-[#c8553d] ps-4" dir="auto">
          <p className={`${/[؀-ۿ]/.test(chapter.pullQuote.text) ? "font-urdu text-xl leading-[2.1]" : "font-display text-xl italic"}`}>
            &ldquo;{chapter.pullQuote.text}&rdquo;
          </p>
        </blockquote>
      )}

      {ur.length > 0 && (
        <div className="mt-5 space-y-3" dir="rtl" lang="ur">
          {ur.map((p, i) => (
            <p key={i} className="font-urdu text-lg leading-[2.3]">
              {p}
            </p>
          ))}
        </div>
      )}
      {en.length > 0 && (
        <div className={`space-y-3 ${ur.length ? "mt-6 border-t border-[#c9ad7f]/60 pt-5" : "mt-5"}`}>
          {en.map((p, i) => (
            <p key={i} className="font-display text-base leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      )}

      <p className="mt-8 border-t border-[#c9ad7f]/60 pt-3 text-xs text-[#7a5a3a]">
        {family} · Yaadon ki Baithak · Recorded in {teller}&apos;s own voice; only their words are used.
      </p>
    </article>
  );
}

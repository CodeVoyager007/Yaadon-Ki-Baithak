"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { StoryImage } from "@/components/book/StoryImage";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { bookPages, coverImage, shownQuote } from "@/lib/book-pages";
import { elderLabel, loadBook, type FamilyBook } from "@/lib/book-store";
import { listChapters, voiceLength, type StoredChapter } from "@/lib/chapter-store";
import { syncBook } from "@/lib/data/sync";
import { downloadPdf, pdfName } from "@/lib/pdf";

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
 * The family book laid out as paper pages: a cover, then each storybook's
 * title page and pages, Urdu and English. Once the paintings have loaded the
 * pages are turned into a PDF file and downloaded straight away, no print
 * window. `?chapter=<id>` makes the PDF of a single storybook.
 */
function PrintBook() {
  const params = useSearchParams();
  const [book, setBook] = useState<FamilyBook | null | undefined>(undefined);
  const [chapters, setChapters] = useState<StoredChapter[]>([]);
  const started = useRef(false);
  const [status, setStatus] = useState<{ state: "preparing" | "making" | "done" | "failed"; note: string }>({
    state: "preparing",
    note: "Getting the paintings ready…",
  });
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

  const fileName = () => {
    const title = only && chapters[0] ? chapters[0].chapter.title.en || chapters[0].chapter.title.ur : undefined;
    return pdfName(book?.familyName, title);
  };

  const makePdf = async () => {
    const pages = [...document.querySelectorAll<HTMLElement>(".print-book .print-page")];
    setStatus({ state: "making", note: `Making the PDF… page 1 of ${pages.length}` });
    try {
      await downloadPdf(pages, fileName(), (done, total) =>
        setStatus({ state: "making", note: `Making the PDF… page ${Math.min(done + 1, total)} of ${total}` }),
      );
      setStatus({ state: "done", note: "Your PDF has downloaded. Look in your Downloads folder." });
    } catch {
      setStatus({ state: "failed", note: "We couldn't make the PDF here. Try again, or use Print and choose “Save as PDF”." });
    }
  };

  // Make and download the PDF once the fonts and paintings are ready.
  useEffect(() => {
    if (!book || !chapters.length || started.current) return;
    started.current = true;
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
    // A short pause first lets paintings kept on this device swap in for their placeholders.
    const settle = new Promise((r) => setTimeout(r, 600));
    void Promise.race([Promise.all([document.fonts.ready, settle, ...loaded]), timeout]).then(() => {
      if (live) void makePdf();
    });
    return () => {
      live = false;
      started.current = false;
    };
    // makePdf reads the current book and chapters; it only needs to run when they arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const first = chapters[0];

  return (
    <div className="min-h-[100svh] bg-[#2b2d5c] pb-16 print:bg-white print:pb-0">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[#12133a]/95 px-5 py-3 backdrop-blur print:hidden">
        <Link href={only ? `/book/chapter/${only}` : "/book"} className="inline-flex items-center gap-2 text-sm font-bold text-moon/80 hover:text-moon">
          <ArrowLeft size={16} /> Back
        </Link>
        {chapters.length > 0 && (
          <p className="text-sm text-moon/80" role="status" aria-live="polite">
            {status.note}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!chapters.length}
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-moon/80 hover:text-moon disabled:opacity-50"
          >
            <Printer size={16} /> Print
          </button>
          <button
            type="button"
            onClick={() => void makePdf()}
            disabled={!chapters.length || status.state === "making" || status.state === "preparing"}
            className="btn-lantern pixel-corners inline-flex h-11 items-center gap-2 px-5 font-extrabold disabled:opacity-50"
          >
            <Download size={17} /> {status.state === "done" ? "Download again" : "Download PDF"}
          </button>
        </div>
      </div>

      {!book || !chapters.length ? (
        <p className="mx-auto mt-24 max-w-md px-5 text-center text-moon/80">
          {book ? "There are no storybooks to print yet. Record a story first." : "We couldn't find a family book on this device."}
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
              {first && (
                <StoryImage
                  src={coverImage(first)}
                  fallback={SCENE_IMAGES[first.scene].src}
                  className="mt-10 aspect-[4/3] w-full max-w-md rounded-md object-cover"
                />
              )}
              <p className="mt-10 text-base text-[#5a4636]">
                {chapters.length} {chapters.length === 1 ? "storybook" : "storybooks"}
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

/** One storybook on paper: a title page, then one page per story page with its painting above the words. */
function PrintChapter({ stored, teller, family }: { stored: StoredChapter; teller: string; family: string }) {
  const { chapter } = stored;
  const pages = bookPages(stored);
  const quote = shownQuote(chapter);
  const coverFallback = SCENE_IMAGES[stored.scene].src;

  return (
    <>
      <section className="print-page print-cover flex min-h-[287mm] flex-col items-center justify-center rounded-md bg-[#fbf3e4] px-10 py-14 text-center shadow-2xl">
        <StoryImage src={coverImage(stored)} fallback={coverFallback} className="aspect-[4/3] w-full max-w-lg rounded-md object-cover" />
        {chapter.title.ur && (
          <p className="font-urdu mt-8 text-3xl leading-[2] text-[#9e2b25]" dir="rtl" lang="ur">
            {chapter.title.ur}
          </p>
        )}
        <h2 className="font-display mt-1 text-4xl leading-tight">{chapter.title.en}</h2>
        <p className="mt-4 text-[#5a4636]">
          Told by {teller}
          {chapter.place ? `, ${chapter.place}` : ""}
          {chapter.year ? `, ${chapter.year}` : ""}
        </p>
        <p className="mt-1 text-sm text-[#7a5a3a]">
          Recorded {longDate(stored.createdAt)} · {voiceLength(stored.turns)} of voice{stored.draft ? " · draft, the story word for word" : ""}
        </p>
        {quote && (
          <blockquote className="mt-8 max-w-md border-s-4 border-[#c8553d] ps-4 text-start" dir="auto">
            <p className={/[\u0600-\u06FF]/.test(quote.text) ? "font-urdu text-xl leading-[2.1]" : "font-display text-xl italic"}>
              &ldquo;{quote.text}&rdquo;
            </p>
          </blockquote>
        )}
      </section>

      {pages.map((p, i) => {
        const ur = paragraphs(p.ur);
        const en = paragraphs(p.en);
        return (
          <article key={i} className="print-page rounded-md bg-[#fbf3e4] px-10 py-12 shadow-2xl">
            <StoryImage src={p.image} fallback={p.fallback} className="aspect-[4/3] w-full rounded-md object-cover" />
            {ur.length > 0 && (
              <div className="mt-6 space-y-2" dir="rtl" lang="ur">
                {ur.map((t, j) => (
                  <p key={j} className="font-urdu text-xl leading-[2.3]">
                    {t}
                  </p>
                ))}
              </div>
            )}
            {en.length > 0 && (
              <div className={`space-y-2 ${ur.length ? "mt-5 border-t border-[#c9ad7f]/60 pt-4" : "mt-6"}`}>
                {en.map((t, j) => (
                  <p key={j} className="font-display text-lg leading-relaxed">
                    {t}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-8 flex justify-between border-t border-[#c9ad7f]/60 pt-3 text-xs text-[#7a5a3a]">
              <span>
                {family} · {chapter.title.en || chapter.title.ur}
              </span>
              <span>
                {i + 1} / {pages.length}
              </span>
            </p>
          </article>
        );
      })}
    </>
  );
}

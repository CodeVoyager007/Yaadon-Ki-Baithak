"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { ChapterCard } from "@/components/stories/ChapterCard";
import { SAMPLE_CHAPTERS } from "@/lib/samples";

const HEADING = "The stories Nani told at bedtime";
const BLURB =
  "Umro Ayyar, Ali Baba, Gul Bakawali. Every family tells them a little differently, and that version deserves to be kept. These sample chapters show the format; your book will hold your own family's voices.";

export function StoryShelf() {
  return (
    <div id="stories" className="scroll-mt-0">
      <StoryShelfClassic />
    </div>
  );
}

/** A swipeable shelf with buttons. A normal sideways scroll: the page itself never stops. */
function StoryShelfClassic() {
  const shelf = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = shelf.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 380), behavior: "smooth" });
  };

  return (
    <section className="sd-shelf relative scroll-mt-24 py-24">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5">
        <div className="sd-focus max-w-xl">
          <h2 className="font-display text-4xl font-semibold leading-tight text-moon sm:text-5xl">{HEADING}</h2>
          <p className="mt-4 text-moon/80">{BLURB}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous stories" className="glass-night grid h-12 w-12 place-items-center rounded-full text-moon">
            <ChevronLeft />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next stories" className="glass-night grid h-12 w-12 place-items-center rounded-full text-moon">
            <ChevronRight />
          </button>
        </div>
      </div>

      <div
        ref={shelf}
        className="shelf mt-12 flex gap-6 overflow-x-auto pb-6"
        style={{ paddingInline: "max(1.25rem, calc((100vw - 72rem) / 2 + 1.25rem))", scrollPaddingInline: "max(1.25rem, calc((100vw - 72rem) / 2 + 1.25rem))" }}
        tabIndex={0}
        aria-label="Sample chapters"
      >
        {SAMPLE_CHAPTERS.map((c, i) => (
          <div key={c.slug} className="sd-fan shrink-0" style={{ "--i": i, "--tilt": i % 2 ? 5 : -5 } as React.CSSProperties}>
            <ChapterCard chapter={c} className="w-[300px] sm:w-[340px]" />
          </div>
        ))}
      </div>
    </section>
  );
}

import { Play } from "lucide-react";
import { seeded } from "@/lib/random";
import type { SampleChapter } from "@/lib/samples";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";

function Waveform({ seed, bars = 34 }: { seed: number; bars?: number }) {
  const r = seeded(seed);
  return (
    <div className="flex h-7 flex-1 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="w-[3px] bg-lantern/80" style={{ height: `${20 + r() * 80}%` }} />
      ))}
    </div>
  );
}

type Props = {
  chapter: SampleChapter;
  compact?: boolean;
  className?: string;
};

/** A chapter as it appears in a family book, framed like a storybook page. */
export function ChapterCard({ chapter, compact = false, className }: Props) {
  const image = chapter.image ?? SCENE_IMAGES[chapter.scene];
  return (
    <article className={`glass-night overflow-hidden rounded-[28px] text-moon ${className ?? ""}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`chapter-scene block w-full object-cover ${compact ? "h-40" : "h-48"}`}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#12133a]/80 to-transparent" />
        <span className="font-pixel absolute left-4 top-4 rounded-md bg-[#12133a]/70 px-2 py-0.5 text-xs text-lantern-soft">
          {chapter.year}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="font-display text-xl leading-tight text-moon">{chapter.title}</h3>
          {chapter.urdu && (
            <p className="font-urdu mt-1 text-lg leading-[1.9] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
              {chapter.urdu}
            </p>
          )}
          <p className="mt-1 text-sm text-moon/70">
            {chapter.teller}, {chapter.place}
          </p>
        </div>
        {!compact && <p className="chapter-excerpt font-display text-[15px] italic leading-relaxed text-moon/85">“{chapter.excerpt}”</p>}
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lantern text-ink" aria-hidden>
            <Play size={16} fill="currentColor" />
          </span>
          <Waveform seed={chapter.title.length * 31} />
          <span className="font-pixel text-sm text-moon/80">{chapter.voice}</span>
        </div>
      </div>
    </article>
  );
}

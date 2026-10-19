"use client";

import { ChevronDown } from "lucide-react";
import { VoiceClip } from "@/components/app/VoiceClip";
import type { StoredChapter } from "@/lib/chapter-store";

const isUrdu = (text: string) => /[؀-ۿ]/.test(text);

/**
 * Under the book: every recording the story was written from, exactly as it
 * was said, with the question Hudhud asked before it. The proof that nothing
 * was invented. Closed by default so the book comes first.
 */
export function BehindTheStory({ stored, who }: { stored: StoredChapter; who: string }) {
  const { turns } = stored;
  const recordings = turns.filter((t) => t.role === "elder");
  if (!recordings.length) return null;

  return (
    <details className="group glass-night mt-10 rounded-[26px]">
      <summary className="flex cursor-pointer list-none items-center gap-x-2 px-6 py-4 font-bold text-moon/85 hover:text-moon [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          Behind the story{" "}
          <span className="font-normal text-moon/55">
            · {recordings.length} {recordings.length === 1 ? "recording" : "recordings"} in {who}&apos;s own voice
          </span>
        </span>
        <ChevronDown size={16} aria-hidden className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ol className="space-y-3 px-6 pb-6">
        {recordings.map((t) => {
          const asked = turns.filter((q) => q.role === "birdy" && q.index < t.index).at(-1);
          return (
            <li key={t.index} className="rounded-[20px] bg-white/5 p-4 sm:p-5">
              {asked && (
                <p className="text-sm text-moon/55" dir="auto">
                  Hudhud: {asked.text}
                </p>
              )}
              <p className={`mt-1 text-moon ${isUrdu(t.text) ? "font-urdu text-lg leading-[2.1]" : ""}`} dir="auto">
                {t.text.trim() || <span className="text-moon/50">Voice only, no transcript yet.</span>}
              </p>
              <div className="mt-3">
                <VoiceClip clipId={t.clipId} audioPath={t.audioPath} durationMs={t.durationMs} />
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

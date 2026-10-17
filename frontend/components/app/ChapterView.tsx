"use client";

import { useState } from "react";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";
import { VoiceClip } from "@/components/app/VoiceClip";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { elderLabel, type Elder } from "@/lib/book-store";
import { voiceLength, type StoredChapter } from "@/lib/chapter-store";

type Lang = "both" | "ur" | "en";

const isUrdu = (text: string) => /[\u0600-\u06FF]/.test(text);

function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/**
 * A finished chapter: the painting, the story in Urdu and English,
 * a pull quote in the elder's real voice, and every answer it came from.
 */
export function ChapterView({ stored, elder }: { stored: StoredChapter; elder: Elder | null }) {
  const [lang, setLang] = useState<Lang>("both");
  const { chapter, turns } = stored;
  const who = elder ? elderLabel(elder) : "Their storyteller";
  const answers = turns.filter((t) => t.role === "elder");
  const quoteTurn = chapter.pullQuote ? turns.find((t) => t.index === chapter.pullQuote!.turnIndex) : undefined;
  const ur = paragraphs(chapter.body.ur);
  const en = paragraphs(chapter.body.en);
  // In "Both", only show a column that has words in it.
  const showUr = lang === "ur" || (lang === "both" && (ur.length > 0 || en.length === 0));
  const showEn = lang === "en" || (lang === "both" && en.length > 0);
  const img = stored.imageUrl ?? SCENE_IMAGES[stored.scene].src;
  const parsedDate = new Date(stored.createdAt);
  const date = !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "recently";

  return (
    <article>
      {/* cover */}
      <div className="rounded-[34px] p-[8px]" style={AJRAK_BORDER}>
        <div className="relative overflow-hidden rounded-[27px] bg-dusk">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt=""
            onError={(e) => {
              // An expired painting link falls back to the topic's own picture.
              const fallback = SCENE_IMAGES[stored.scene].src;
              if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback;
            }}
            className="h-[300px] w-full object-cover sm:h-[380px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-raat via-raat/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-2">
              {chapter.year && <span className="font-pixel rounded-md bg-raat/70 px-2 py-0.5 text-xs text-lantern-soft">{chapter.year}</span>}
              {stored.draft && <span className="rounded-md bg-lantern/90 px-2 py-0.5 text-xs font-bold text-ink">Draft: transcript only</span>}
            </div>
            <h1 className="font-display mt-3 text-3xl leading-tight text-moon sm:text-5xl">{chapter.title.en}</h1>
            <p className="font-urdu mt-1 text-2xl leading-[1.9] text-lantern-soft sm:text-3xl" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
              {chapter.title.ur}
            </p>
            <p className="mt-2 text-sm text-moon/75">
              Told by {who}
              {chapter.place ? `, ${chapter.place}` : ""}. Recorded {date}. {voiceLength(turns)} of voice.
            </p>
          </div>
        </div>
      </div>

      {/* language switch */}
      <div className="mt-8 flex justify-center">
        <div className="glass-night inline-flex rounded-full p-1" role="tablist" aria-label="Language">
          {(
            [
              ["both", "Both"],
              ["ur", "اردو"],
              ["en", "English"],
            ] as [Lang, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={lang === id}
              onClick={() => setLang(id)}
              className={`h-10 rounded-full px-5 text-sm font-bold transition ${lang === id ? "bg-lantern text-ink" : "text-moon/75 hover:text-moon"} ${id === "ur" ? "font-urdu text-base" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* the story */}
      <div className={`mt-8 grid gap-6 ${showUr && showEn ? "lg:grid-cols-2" : ""}`}>
        {showUr && (
          <section className="glass-night rounded-[28px] p-6 sm:p-8" dir="rtl" lang="ur">
            {ur.length ? (
              ur.map((p, i) => (
                <p key={i} className="font-urdu mb-5 text-xl leading-[2.3] text-moon last:mb-0 sm:text-2xl sm:leading-[2.3]">
                  {p}
                </p>
              ))
            ) : (
              <p className="font-urdu text-lg leading-[2.2] text-moon/60">اردو ورژن کہانی لکھنے والا ایجنٹ لکھے گا۔</p>
            )}
          </section>
        )}
        {showEn && (
          <section className="glass-night rounded-[28px] p-6 sm:p-8">
            {en.length ? (
              en.map((p, i) => (
                <p key={i} className="font-display mb-5 text-lg leading-[1.8] text-moon/90 last:mb-0">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-moon/60">
                The English version is written by the story writer agent. Until it&apos;s connected, the chapter shows {who}&apos;s words as
                they said them.
              </p>
            )}
          </section>
        )}
      </div>
      {lang === "both" && en.length === 0 && ur.length > 0 && (
        <p className="mt-3 text-center text-sm text-moon/55">The English version appears here once the story writer agent is connected.</p>
      )}

      {/* pull quote in their real voice */}
      {chapter.pullQuote && (
        <figure className="glass-night mx-auto mt-8 max-w-2xl rounded-[28px] p-6 text-center sm:p-8">
          {isUrdu(chapter.pullQuote.text) ? (
            <blockquote className="font-urdu text-2xl leading-[2.2] text-lantern-soft sm:text-3xl sm:leading-[2.2]" dir="rtl" lang="ur">
              «{chapter.pullQuote.text}»
            </blockquote>
          ) : (
            <blockquote className="font-display text-2xl italic leading-snug text-lantern-soft">&ldquo;{chapter.pullQuote.text}&rdquo;</blockquote>
          )}
          <figcaption className="mt-2 text-sm text-moon/60">{who}, in their own words</figcaption>
          <div className="mx-auto mt-5 max-w-sm">
            <VoiceClip clipId={quoteTurn?.clipId} audioPath={quoteTurn?.audioPath} durationMs={quoteTurn?.durationMs} label="Hear this line" />
          </div>
        </figure>
      )}

      {/* every answer, in their voice: the proof that nothing was invented */}
      <section className="mt-12">
        <h2 className="font-display text-2xl text-moon">In {who}&apos;s own voice</h2>
        <p className="mt-1 text-moon/65">Every answer this chapter was written from, exactly as it was recorded.</p>
        <ol className="mt-5 space-y-3">
          {answers.map((t) => {
            const asked = turns.find((q) => q.index === t.index - 1 && q.role === "birdy");
            return (
              <li key={t.index} className="glass-night rounded-[22px] p-4 sm:p-5">
                {asked && (
                  <p className="text-sm text-moon/55" dir="auto">
                    Hudhud asked: {asked.text}
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
      </section>
    </article>
  );
}

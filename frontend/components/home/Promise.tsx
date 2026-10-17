import Link from "next/link";
import { AudioLines, BookOpenCheck, LockKeyhole } from "lucide-react";
import { Birdy } from "@/components/mascots/Birdy";
import river from "@/components/illustrations/trailer/river.jpg";
import { ElderButton } from "./ElderButton";
import { Lantern } from "./Lantern";

const PROMISES = [
  {
    icon: AudioLines,
    title: "Their real voice",
    body: "Every chapter plays the elder's own recording. We never copy, clone or fake anyone's voice.",
  },
  {
    icon: BookOpenCheck,
    title: "Only their words",
    body: "Hudhud never adds names, dates or events they didn't say. Anything unclear is marked, not guessed.",
  },
  {
    icon: LockKeyhole,
    title: "Private until you share",
    body: "Recordings stay in your family book. You decide who gets the link, and you can delete anything.",
  },
];

/** Night has fallen: the promise, then the lanterns light up for the last call. */
export function Promise() {
  return (
    <section id="promise" className="relative scroll-mt-24 px-5 py-28">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="reveal">
          <p className="font-urdu mb-3 text-2xl leading-[2] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
            یادیں امانت ہیں
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight text-moon sm:text-5xl">
            A family&apos;s memories are a trust. We keep them that way.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-moon/85">
            Baithak is built for grandparents first: nothing is invented, nothing is shared without you, and no voice is ever
            imitated.
          </p>
        </div>

        <ul className="glass-night divide-y divide-moon/15 rounded-[28px] px-7 py-2">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="reveal flex gap-5 py-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lantern/15 text-lantern-soft">
                <Icon size={22} aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-xl text-moon">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-moon/80">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="reveal relative mx-auto mt-28 flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-[40px] border border-moon/15 px-6 pb-20 pt-6 text-center shadow-[0_40px_90px_-40px_rgba(2,2,18,0.95)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={river.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b26] via-[#0b0b26]/75 to-[#0b0b26]/35" />
        {/* a string of lanterns that light up one by one as the card scrolls in */}
        <div aria-hidden className="relative flex w-full max-w-3xl justify-between px-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`lantern-light relative ${i % 2 ? "mt-6" : ""}`} style={{ ["--i" as string]: i }}>
              <span className="absolute left-1/2 top-[62%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lantern/40 blur-2xl" />
              <Lantern size={i === 2 ? 110 : 84} className="relative" />
            </span>
          ))}
        </div>
        <Birdy mood="happy" size={110} className="relative" />
        <p className="font-urdu relative -mb-4 text-3xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
          آج رات ایک کہانی سے شروع کریں
        </p>
        <h2 className="font-display relative max-w-2xl text-4xl font-semibold text-moon sm:text-5xl">Start with one story tonight.</h2>
        <div className="relative flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="btn-lantern pixel-corners inline-flex h-[60px] items-center px-7 font-extrabold">
            Start your family book
          </Link>
          <ElderButton />
        </div>
      </div>
    </section>
  );
}

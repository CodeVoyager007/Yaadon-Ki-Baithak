"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ScrollWords } from "./ScrollWords";
import { AudioLines, BookOpenCheck, LockKeyhole } from "lucide-react";
import { Birdy } from "@/components/mascots/Birdy";
import river from "@/components/illustrations/trailer/river.jpg";
import { ElderButton } from "./ElderButton";

const PROMISES = [
  {
    icon: AudioLines,
    title: "Their real voice",
    body: "Every chapter plays the elder's own recording. We never copy, clone or fake anyone's voice.",
  },
  {
    icon: BookOpenCheck,
    title: "Only their words",
    body: "Laali never adds names, dates or events they didn't say. Anything unclear is marked, not guessed.",
  },
  {
    icon: LockKeyhole,
    title: "Private until you share",
    body: "Recordings stay in your family book. You decide who gets the link, and you can delete anything.",
  },
];

export function Promise() {
  const reduce = useReducedMotion();
  // One reveal per element as it enters; nothing moves for reduced motion.
  const rise = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 40 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "0px 0px -15% 0px" },
          transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section id="promise" className="relative scroll-mt-24 px-5 py-28">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="font-urdu mb-3 text-2xl leading-[2] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>
            یادیں امانت ہیں
          </p>
          <ScrollWords
            text="When an elder passes away, their stories shouldn't go with them."
            className="font-display text-4xl font-semibold leading-tight text-moon sm:text-5xl"
          />
          <motion.p {...rise(0.1)} className="mt-6 max-w-lg text-lg leading-relaxed text-moon/85">
            Most of what our grandparents lived through was never written down. It lives in how they tell it, in
            their language, at their pace. Baithak helps the youngest person in the family become its historian.
          </motion.p>
        </div>

        <ul className="glass-night divide-y divide-moon/15 rounded-[28px] px-7 py-2">
          {PROMISES.map(({ icon: Icon, title, body }, i) => (
            <motion.li key={title} {...rise(0.15 * i)} className="flex gap-5 py-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lantern/15 text-lantern-soft">
                <Icon size={22} aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-xl text-moon">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-moon/80">{body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.div
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0, scale: 0.94 },
              whileInView: { opacity: 1, scale: 1 },
              viewport: { once: true, margin: "0px 0px -10% 0px" },
              transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const },
            })}
        className="relative mx-auto mt-28 flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-[40px] border border-moon/15 px-6 py-20 text-center shadow-[0_40px_90px_-40px_rgba(2,2,18,0.95)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={river.src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b26] via-[#0b0b26]/70 to-[#0b0b26]/30" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(242,169,59,0.35),transparent_60%)]" />
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
      </motion.div>
    </section>
  );
}

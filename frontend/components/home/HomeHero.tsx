import Link from "next/link";
import skyline from "@/components/scene/karachi-skyline.jpg";
import { SkyLantern } from "@/components/effects/SkyLantern";
import { Diary } from "./Diary";
import { ElderButton } from "./ElderButton";

/**
 * Sunset over Karachi, and Dadi's book open on the right: write to it and it
 * writes back. As it scrolls away, the words drift up, the book tips back and
 * the city sinks slower than the page (CSS scroll timelines, no pinning).
 */
export function HomeHero() {
  return (
    <section className="relative isolate overflow-clip pb-[clamp(140px,22vh,220px)] pt-28">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[75%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(236,120,76,0.55)_0%,rgba(200,85,61,0.28)_35%,rgba(74,51,102,0.15)_60%,transparent_75%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={skyline.src}
        alt=""
        aria-hidden
        fetchPriority="high"
        className="sd-skyline absolute inset-x-0 bottom-0 h-[42vh] w-full object-cover object-bottom opacity-100 [mask-image:linear-gradient(to_top,black_78%,transparent_100%)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2b2d5c] to-transparent" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1fr_1fr]">
        <div className="sd-hero-copy">
          <p className="font-urdu text-3xl leading-[2] text-lantern-soft sm:text-4xl" lang="ur" dir="rtl" style={{ textAlign: "left" }}>
            ہر بزرگ ایک کتاب ہے
          </p>
          <h1 className="font-display mt-1 text-[clamp(2.6rem,6vw,5.4rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-moon">
            Every elder is a&nbsp;library.
          </h1>
          <p className="mt-6 max-w-[32rem] text-lg leading-relaxed text-moon/85">
            Hudhud sits with your Nani, asks gentle questions in her own language, and turns her answers into an illustrated
            storybook with her real voice inside. Try it: write to Dadi&apos;s book.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="btn-lantern pixel-corners inline-flex h-[60px] items-center px-7 text-base font-extrabold">
              Start your family book
            </Link>
            <ElderButton />
          </div>
        </div>
        <div className="sd-hero-book">
          <Diary />
        </div>
      </div>
      {/* Flying Sky Lanterns on both sides */}
      <SkyLantern delay={0.5} duration={11} className="bottom-[6vh] right-[8vw]" />
      <SkyLantern delay={1.8} duration={13} className="bottom-[4vh] left-[6vw]" />
      <SkyLantern delay={3.2} duration={13} className="bottom-[3vh] right-[24vw]" />
      <SkyLantern delay={4.6} duration={12} className="bottom-[7vh] left-[18vw]" />
      <SkyLantern delay={6.5} duration={12} className="bottom-[8vh] right-[54vw]" />
    </section>
  );
}

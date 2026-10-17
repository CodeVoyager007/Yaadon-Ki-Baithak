import Link from "next/link";
import { Birdy } from "@/components/mascots/Birdy";
import { NightSky } from "@/components/scene/NightSky";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden px-5 text-center text-moon">
      <NightSky full={false} skyline="dim" />
      <div className="relative z-10 flex flex-col items-center">
        <Birdy mood="listening" size={130} />
        <p className="font-urdu mt-4 text-3xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
          یہ صفحہ نہیں ملا
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">Hudhud looked everywhere.</h1>
        <p className="mt-3 max-w-sm text-moon/70">This page doesn&apos;t exist, or the link was mistyped.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-lantern pixel-corners inline-flex h-12 items-center px-6 font-extrabold">
            Go to the home page
          </Link>
          <Link href="/book" className="glass-night inline-flex h-12 items-center rounded-2xl px-5 font-bold hover:bg-white/15">
            Open your family book
          </Link>
        </div>
      </div>
    </div>
  );
}

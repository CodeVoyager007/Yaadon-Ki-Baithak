"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppBackdrop } from "@/components/app/AppBackdrop";
import { AppHeader } from "@/components/app/AppHeader";
import { BookNav } from "@/components/app/BookNav";
import { cleanElder, EMPTY_ELDER, ElderFields, type ElderDraft } from "@/components/app/Fields";
import { BirdySays } from "@/components/app/SpeechBubble";
import { useSound } from "@/components/sound/SoundProvider";
import { addElder } from "@/lib/book-store";

export default function NewElderPage() {
  const router = useRouter();
  const { chirp } = useSound();
  const [elder, setElder] = useState<ElderDraft>(EMPTY_ELDER);
  const ready = elder.name.trim().length > 0;

  function save() {
    if (!ready) return;
    const created = addElder(cleanElder(elder));
    chirp();
    router.push(created ? `/record?elder=${created.id}` : "/book");
  }

  return (
    <div className="relative min-h-[100svh]">
      <AppBackdrop />
      <AppHeader back={{ href: "/book", label: "Family book" }} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        <BirdySays mood="listening">Who else has stories to tell?</BirdySays>
        <section className="glass-night mt-6 rounded-[32px] p-6 sm:p-9">
          <ElderFields value={elder} onChange={setElder} autoFocus />
          <div className="mt-9 flex items-center justify-between gap-4">
            <button type="button" onClick={() => router.push("/book")} className="h-12 rounded-2xl px-4 font-bold text-moon/70 hover:text-moon">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={!ready} className="btn-lantern pixel-corners h-14 px-8 font-extrabold disabled:cursor-not-allowed disabled:opacity-50">
              Add and start recording
            </button>
          </div>
        </section>
      </main>
      <BookNav />
    </div>
  );
}

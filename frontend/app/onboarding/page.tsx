"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { AppBackdrop } from "@/components/app/AppBackdrop";
import { BirdySays } from "@/components/app/SpeechBubble";
import { Wordmark } from "@/components/brand/Wordmark";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { SceneByName } from "@/components/illustrations/SceneByName";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { useSound } from "@/components/sound/SoundProvider";
import { newId, saveBook, type Theme } from "@/lib/book-store";
import { cleanElder, EMPTY_ELDER, ElderFields, TextInput, type ElderDraft } from "@/components/app/Fields";
import { hasSupabase, supabaseBrowser } from "@/lib/supabase/client";
import { THEMES } from "@/lib/themes";

const STEPS = ["Your book", "First storyteller", "First story"];

export default function OnboardingPage() {
  const router = useRouter();
  const { chirp } = useSound();
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState("");
  const [elder, setElder] = useState<ElderDraft>(EMPTY_ELDER);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [finishing, setFinishing] = useState(false);

  const canNext = step === 0 ? familyName.trim().length > 1 : step === 1 ? elder.name.trim().length > 0 : theme !== null;
  const who = elder.relation === "Other" ? elder.name || "they" : `${elder.relation}${elder.name ? ` ${elder.name}` : ""}`;

  async function next() {
    if (!canNext) return;
    chirp();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setFinishing(true);
    const ownerId = hasSupabase ? (await supabaseBrowser().auth.getUser()).data.user?.id : undefined;
    saveBook({
      ownerId,
      familyName: familyName.trim().slice(0, 80),
      elders: [{ id: newId(), ...cleanElder(elder) }],
      theme: theme!,
      createdAt: new Date().toISOString(),
    });
    window.setTimeout(() => router.push("/book"), 1400);
  }

  const prompts = [
    "What should we call your family book?",
    "Who's telling the first story?",
    `What would ${who} love to talk about?`,
  ];

  return (
    <div className="relative min-h-[100svh]">
      <AppBackdrop />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-7">
        <Wordmark tone="night" />
        <SoundToggle tone="night" />
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10">
        {/* pixel stepper: a real sequence, so numbered */}
        <ol className="flex items-center gap-2" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`font-pixel grid h-9 w-9 shrink-0 place-items-center text-sm ${
                  i < step ? "bg-leaf text-moon" : i === step ? "bg-lantern text-ink" : "bg-white/10 text-moon/50"
                } pixel-corners`}
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? <Check size={16} /> : i + 1}
              </span>
              <span className={`hidden text-sm font-bold sm:inline ${i === step ? "text-moon" : "text-moon/50"}`}>{label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-1 flex-1 bg-[linear-gradient(90deg,#fff4dc_50%,transparent_50%)] bg-[length:8px_4px] opacity-25" />}
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <BirdySays mood={finishing ? "happy" : step === 1 ? "listening" : "idle"}>
            {finishing ? "Lovely. Your book is ready." : prompts[step]}
          </BirdySays>
        </div>

        <section className="glass-night mt-6 rounded-[32px] p-6 sm:p-9">
          {finishing ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <PixelLantern size={64} />
              <p className="font-display text-2xl text-moon">Setting up {familyName.trim()}</p>
            </div>
          ) : step === 0 ? (
            <div>
              <TextInput label="Family book name" value={familyName} onChange={setFamilyName} placeholder="The Mughal family book" autoFocus />
              <p className="mt-3 text-sm text-moon/70">You can add more elders to the same book later.</p>
            </div>
          ) : step === 1 ? (
            <ElderFields value={elder} onChange={setElder} autoFocus />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {THEMES.map((t) => {
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    aria-pressed={active}
                    className={`group flex items-center gap-4 overflow-hidden rounded-[22px] border-2 bg-white/5 p-2 pr-4 text-left transition ${
                      active ? "border-lantern shadow-[0_0_0_4px_rgba(242,169,59,0.25)]" : "border-transparent hover:border-white/15"
                    }`}
                  >
                    <SceneByName name={t.scene} className="h-[72px] w-[96px] shrink-0 rounded-2xl" />
                    <span>
                      <span className="font-display block text-lg leading-tight text-moon">{t.id}</span>
                      <span className="text-sm text-moon/70">{t.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!finishing && (
            <div className="mt-9 flex items-center justify-between gap-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="h-12 rounded-2xl px-4 font-bold text-moon/70 hover:text-moon">
                  Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                className="btn-lantern pixel-corners h-14 px-8 text-base font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step < 2 ? "Continue" : "Open my family book"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

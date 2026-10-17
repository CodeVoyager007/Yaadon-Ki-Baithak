import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { NightSky } from "@/components/scene/NightSky";
import { Wordmark } from "@/components/brand/Wordmark";
import { SoundToggle } from "@/components/sound/SoundToggle";

export const metadata: Metadata = { title: "Start your family book" };

export default function SignupPage() {
  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden">
      <NightSky full={false} skyline="dim" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pt-6">
        <Wordmark />
        <SoundToggle />
      </header>
      <main className="relative z-10 grid min-h-[calc(100svh-90px)] place-items-center px-5 pb-16 pt-24">
        <Suspense>
          <SignupForm />
        </Suspense>
      </main>
    </div>
  );
}

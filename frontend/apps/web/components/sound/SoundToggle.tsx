"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "./SoundProvider";

export function SoundToggle({ tone = "night" }: { tone?: "night" | "day" }) {
  const { enabled, toggle } = useSound();
  const night = tone === "night";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn night sounds off" : "Turn night sounds on"}
      className={`${night ? "glass-night text-moon" : "glass-day text-ink"} inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold`}
    >
      {enabled ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
      <span className="hidden sm:inline">{enabled ? "Sound on" : "Sound off"}</span>
    </button>
  );
}

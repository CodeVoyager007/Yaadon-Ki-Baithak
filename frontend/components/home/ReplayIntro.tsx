"use client";

import { Clapperboard } from "lucide-react";

export function ReplayIntro() {
  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "instant" });
        window.dispatchEvent(new Event("baithak:intro"));
      }}
      className="inline-flex items-center gap-2 text-sm font-bold text-lantern-soft hover:underline motion-reduce:hidden"
    >
      <Clapperboard size={16} /> Watch the intro
    </button>
  );
}

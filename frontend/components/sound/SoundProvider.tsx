"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { NightSound } from "@/lib/sound";

type SoundState = {
  /** The visitor's choice. On by default until they turn it off. */
  enabled: boolean;
  /** True once the browser has actually started playing. */
  playing: boolean;
  toggle: () => void;
  chirp: () => void;
  /** Cinematic sound effects; silent when sound is turned off. */
  sfx: (kind: "hit" | "whoosh" | "boom") => void;
};

const SoundContext = createContext<SoundState | null>(null);
const STORAGE_KEY = "baithak-sound";

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<NightSound | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "off") setEnabled(false);
    } catch {
      /* storage blocked: keep the default */
    }
  }, []);

  // Browsers block audio until the first click, tap or key press.
  useEffect(() => {
    if (!enabled) return;
    const begin = () => {
      engine.current ??= new NightSound();
      engine.current.start();
      setPlaying(true);
    };
    window.addEventListener("pointerdown", begin, { once: true });
    window.addEventListener("keydown", begin, { once: true });
    return () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("keydown", begin);
    };
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((was) => {
      const next = !was;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (next) {
        engine.current ??= new NightSound();
        engine.current.start();
        setPlaying(true);
      } else {
        engine.current?.stop();
        setPlaying(false);
      }
      return next;
    });
  }, []);

  const chirp = useCallback(() => engine.current?.chirp(), []);
  const sfx = useCallback(
    (kind: "hit" | "whoosh" | "boom") => {
      if (!enabled) return;
      engine.current ??= new NightSound();
      engine.current.sfx(kind);
    },
    [enabled],
  );

  return (
    <SoundContext.Provider value={{ enabled, playing, toggle, chirp, sfx }}>{children}</SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside SoundProvider");
  return ctx;
}

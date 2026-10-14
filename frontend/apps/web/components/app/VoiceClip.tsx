"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getClip } from "@/lib/audio-store";
import { seeded } from "@/lib/random";

function fmt(ms?: number) {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Plays one of the elder's real recordings. The waveform fills as it plays.
 * Clips live on this device until Supabase Storage is connected.
 */
export function VoiceClip({ clipId, durationMs, label = "Play their voice" }: { clipId?: string; durationMs?: number; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [missing, setMissing] = useState(!clipId);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  useEffect(
    () => () => {
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  async function toggle() {
    if (playing) {
      audio.current?.pause();
      return;
    }
    if (!audio.current) {
      const blob = clipId ? await getClip(clipId) : null;
      if (!blob) {
        setMissing(true);
        return;
      }
      url.current = URL.createObjectURL(blob);
      const a = new Audio(url.current);
      a.ontimeupdate = () => setProgress(a.duration && Number.isFinite(a.duration) ? a.currentTime / a.duration : a.currentTime / ((durationMs ?? 1) / 1000));
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onended = () => {
        setPlaying(false);
        setProgress(0);
      };
      audio.current = a;
    }
    await audio.current.play().catch(() => setMissing(true));
  }

  const r = seeded((clipId ?? "x").split("").reduce((n, c) => n + c.charCodeAt(0), 0));
  const bars = Array.from({ length: 28 }, () => 22 + r() * 78);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={missing}
        aria-label={playing ? "Pause" : label}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lantern text-ink transition hover:bg-lantern-soft disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-moon/40"
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span key={i} className={`w-[3px] ${i / bars.length < progress ? "bg-lantern" : "bg-lantern/35"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
      <span className="font-pixel w-10 text-right text-sm text-moon/70">{missing ? "n/a" : fmt(durationMs)}</span>
    </div>
  );
}

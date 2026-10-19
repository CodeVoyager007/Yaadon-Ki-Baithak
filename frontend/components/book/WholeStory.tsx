"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getClip } from "@/lib/audio-store";
import type { Turn } from "@/lib/chapter-store";
import { signedVoiceUrl } from "@/lib/data/remote";

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

async function sourceOf(t: Turn): Promise<{ src: string; local: boolean } | null> {
  const blob = t.clipId ? await getClip(t.clipId).catch(() => null) : null;
  if (blob) return { src: URL.createObjectURL(blob), local: true };
  if (t.audioPath) {
    const src = await signedVoiceUrl(t.audioPath).catch(() => null);
    if (src) return { src, local: false };
  }
  return null;
}

/**
 * The whole story in the elder's own voice, played once from start to end: every answer they
 * recorded, in order, as one track. Pages are cut for reading and recordings for breathing, so
 * the voice isn't tied to pages; it plays alongside while the family turns them.
 */
export function WholeStory({ turns, who }: { turns: Turn[]; who: string }) {
  const clips = useMemo(() => turns.filter((t) => t.role === "elder" && (t.clipId || t.audioPath)), [turns]);
  const lengths = clips.map((t) => t.durationMs ?? 0);
  const total = lengths.reduce((a, b) => a + b, 0);

  const [playing, setPlaying] = useState(false);
  const [part, setPart] = useState(0);
  const [inPart, setInPart] = useState(0);
  const [missing, setMissing] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  // Bumped on every new start or stop, so a clip that loads late never plays over a newer one.
  const run = useRef(0);

  const release = () => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  };

  useEffect(() => () => release(), []);
  useEffect(() => {
    run.current += 1;
    release();
    setPlaying(false);
    setPart(0);
    setInPart(0);
  }, [clips]);

  async function playFrom(i: number, my: number, played = false) {
    // Skip a clip that can't be found (another device, storage cleared) rather than stopping the story.
    for (; i < clips.length; i++) {
      const found = await sourceOf(clips[i]);
      if (my !== run.current) {
        if (found?.local) URL.revokeObjectURL(found.src);
        return;
      }
      if (!found) continue;
      release();
      if (found.local) url.current = found.src;
      const a = new Audio(found.src);
      audio.current = a;
      setPart(i);
      setInPart(0);
      a.ontimeupdate = () => setInPart(a.currentTime * 1000);
      a.onplay = () => setPlaying(true);
      a.onpause = () => !a.ended && setPlaying(false);
      a.onended = () => void playFrom(i + 1, my, true);
      try {
        await a.play();
        return;
      } catch {
        continue;
      }
    }
    // The end of the story, or none of the voice could be found.
    if (my !== run.current) return;
    release();
    setPlaying(false);
    setPart(0);
    setInPart(0);
    if (!played) setMissing(true);
  }

  function toggle() {
    if (playing) {
      audio.current?.pause();
      return;
    }
    if (audio.current) {
      void audio.current.play().catch(() => setPlaying(false));
      return;
    }
    run.current += 1;
    setPlaying(true);
    void playFrom(part, run.current);
  }

  if (!clips.length) return null;
  const done = lengths.slice(0, part).reduce((a, b) => a + b, 0) + inPart;
  const progress = total ? Math.min(1, done / total) : 0;

  return (
    <div className="glass-night mx-auto flex w-full max-w-md items-center gap-3 rounded-full py-2 pl-2 pr-5">
      <button
        type="button"
        onClick={toggle}
        disabled={missing}
        aria-label={playing ? "Pause the story" : `Hear ${who} tell the whole story`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lantern text-ink transition hover:bg-lantern-soft disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-moon/40"
      >
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-moon/90">
          {missing ? "The voice isn't on this device" : playing || done > 0 ? `${who}, telling the story` : `Hear ${who} tell the whole story`}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-moon/15" role="progressbar" aria-label="Story played" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-lantern transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className="font-pixel shrink-0 text-sm text-moon/70">{total ? `${fmt(done)} / ${fmt(total)}` : ""}</span>
    </div>
  );
}

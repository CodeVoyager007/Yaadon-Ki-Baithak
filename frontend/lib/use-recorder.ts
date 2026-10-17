"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** The bits of the browser's speech recognition we use (not in TypeScript's built-in types). */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type Take = { blob: Blob; durationMs: number; caption: string };
export type MicStatus = "idle" | "asking" | "recording" | "denied" | "unsupported";

/**
 * Records one answer at a time: the real audio (MediaRecorder), a live
 * volume level for the Diya flame, and live captions from the browser
 * when it supports them (a stand-in until /api/transcribe exists).
 */
export function useRecorder(lang: "ur" | "en") {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [level, setLevel] = useState(0);
  const [caption, setCaption] = useState("");

  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const recog = useRef<Recognition | null>(null);
  const finalText = useRef("");

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    try {
      recog.current?.stop();
    } catch {
      /* already stopped */
    }
    recog.current = null;
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      return false;
    }
    setStatus("asking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;

      // flame level
      const audioCtx = new AudioContext();
      ctx.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        setLevel((prev) => prev * 0.7 + Math.min(1, Math.sqrt(sum / data.length) * 6) * 0.3);
        raf.current = requestAnimationFrame(tick);
      };
      tick();

      // the real recording
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.start(1000);
      recorder.current = rec;
      started.current = performance.now();

      // live captions, if the browser has them
      finalText.current = "";
      setCaption("");
      const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
      const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
      if (Ctor) {
        const r = new Ctor();
        r.lang = lang === "ur" ? "ur-PK" : "en-GB";
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) finalText.current += `${res[0].transcript} `;
            else interim += res[0].transcript;
          }
          setCaption(`${finalText.current}${interim}`.trim());
        };
        r.onerror = () => {};
        try {
          r.start();
          recog.current = r;
        } catch {
          /* captions are optional */
        }
      }

      setStatus("recording");
      return true;
    } catch {
      cleanup();
      setStatus("denied");
      return false;
    }
  }, [cleanup, lang]);

  /** Stops and returns the finished take, or null if nothing was recording. */
  const stop = useCallback(async (): Promise<Take | null> => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") {
      cleanup();
      setStatus("idle");
      return null;
    }
    const durationMs = Math.round(performance.now() - started.current);
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    recorder.current = null;
    const text = (finalText.current || caption).trim();
    cleanup();
    setStatus("idle");
    return { blob, durationMs, caption: text };
  }, [caption, cleanup]);

  return { status, level, caption, start, stop };
}

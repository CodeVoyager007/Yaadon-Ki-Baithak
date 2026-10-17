"use client";

import { useEffect, useState } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import type { Source } from "@/lib/api";
import type { InterviewerDecision } from "@/lib/types";

/** One decision Hudhud made, as the record screen keeps it. */
export type Thought = {
  id: string;
  decision: InterviewerDecision;
  source: Source;
};

const OPEN_KEY = "baithak-notebook-open";

const ACTION: Record<InterviewerDecision["action"], string> = {
  follow_up: "Followed a detail",
  new_topic: "Changed the topic",
  wrap_up: "Wrapping up",
};

/**
 * Hudhud's notebook: why he asked what he asked. Helper-facing, so it is
 * small and sits below the elder's controls; it never covers the question.
 * Open by default (it's the proof the interviewer listens), and the choice is
 * remembered on this device.
 */
export function ThinkingPanel({ thoughts }: { thoughts: Thought[] }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === "0") setOpen(false);
    } catch {
      /* private window: stay open */
    }
  }, []);

  function toggle() {
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? "0" : "1");
      } catch {
        /* not remembered, still toggles */
      }
      return !o;
    });
  }

  if (!thoughts.length) return null;
  const recent = [...thoughts].reverse().slice(0, 4);

  return (
    <section className="glass-night mt-8 w-full max-w-lg rounded-[22px] text-left" aria-label="Hudhud's notebook">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-[22px] px-5 py-3 text-sm font-bold text-moon/80 hover:text-moon"
      >
        <NotebookPen size={16} className="text-lantern-soft" aria-hidden />
        Hudhud&apos;s notebook
        <span className="font-normal text-moon/50">· why he asked</span>
        <ChevronDown size={16} aria-hidden className={`ml-auto transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ol className="space-y-3 px-5 pb-4">
          {recent.map((t, i) => (
            <li key={t.id} className={`border-l-2 pl-3 ${i === 0 ? "border-lantern" : "border-white/15 opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge>{ACTION[t.decision.action]}</Badge>
                {t.decision.mood === "sensitive" && <Badge tone="gentle">Gentle: a painful memory</Badge>}
                {t.decision.signals?.tired && <Badge tone="gentle">Sounds tired</Badge>}
                {t.decision.signals?.skipped && <Badge>Skipped last question</Badge>}
                {t.decision.handoff === "story_writer" && <Badge tone="done">Handed to the story writer</Badge>}
                {t.source === "stand-in" && <Badge>Practice question</Badge>}
              </div>
              {t.decision.why && <p className="mt-1.5 text-sm leading-snug text-moon/85">{t.decision.why}</p>}
              {t.decision.heard.length > 0 && i === 0 && (
                <p className="mt-1 text-xs text-moon/55">Heard so far: {t.decision.heard.slice(0, 6).join(", ")}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "gentle" | "done" }) {
  const look =
    tone === "gentle" ? "bg-terracotta/30 text-moon" : tone === "done" ? "bg-leaf/40 text-moon" : "bg-white/10 text-moon/75";
  return <span className={`rounded-full px-2 py-0.5 font-bold ${look}`}>{children}</span>;
}

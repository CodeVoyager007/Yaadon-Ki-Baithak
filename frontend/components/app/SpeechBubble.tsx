import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";

/** Laali saying something, used to guide each step inside the app. */
export function BirdySays({ children, mood = "idle", size = 96 }: { children: React.ReactNode; mood?: BirdyMood; size?: number }) {
  return (
    <div className="flex items-end gap-3">
      <Birdy mood={mood} size={size} className="shrink-0" />
      <div className="glass-night relative mb-6 rounded-[22px] rounded-bl-md px-5 py-3.5">
        <p className="font-display text-xl leading-snug text-moon sm:text-2xl">{children}</p>
      </div>
    </div>
  );
}

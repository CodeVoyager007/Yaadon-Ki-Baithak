import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";

/** Hudhud saying something, used to guide each step inside the app. `as="h1"` when it is the page's heading. */
export function BirdySays({
  children,
  mood = "idle",
  size = 96,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  mood?: BirdyMood;
  size?: number;
  as?: "p" | "h1";
}) {
  return (
    <div className="flex items-end gap-3">
      <Birdy mood={mood} size={size} className="shrink-0" />
      <div className="glass-night relative mb-6 rounded-[22px] rounded-bl-md px-5 py-3.5">
        <Tag className="font-display text-xl font-normal leading-snug text-moon sm:text-2xl">{children}</Tag>
      </div>
    </div>
  );
}

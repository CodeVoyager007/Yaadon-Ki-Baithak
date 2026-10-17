import { ScrollWords } from "./ScrollWords";

/** Dusk falls. One line, lit word by word as it scrolls past; nothing is held. */
export function QuietLine() {
  return (
    <section className="relative px-5 py-32 sm:py-44">
      <div className="mx-auto max-w-4xl text-center">
        <p className="reveal font-urdu text-2xl leading-[2] text-lantern-soft sm:text-3xl" lang="ur" dir="rtl">
          جب وہ نہ رہیں، تو یہ کہانی کون سنائے گا؟
        </p>
        <ScrollWords
          text="When she's gone, who will tell this story?"
          className="font-display mt-2 text-4xl font-semibold leading-tight text-moon sm:text-6xl"
        />
        <p className="reveal mx-auto mt-8 max-w-xl text-lg leading-relaxed text-moon/80">
          Most of what our grandparents lived through was never written down. It lives in how they tell it, in their language,
          at their pace. Baithak helps the youngest person in the family become its historian.
        </p>
      </div>
    </section>
  );
}

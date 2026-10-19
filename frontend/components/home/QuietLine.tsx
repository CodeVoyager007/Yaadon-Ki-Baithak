const QUESTION = "When she’s gone, who will tell this story?";

/** The question at the heart of it. As it scrolls through, it lights up word by word. */
export function QuietLine() {
  return (
    <section className="sd-words relative px-5 py-12 sm:py-14">
      <div className="mx-auto max-w-4xl text-center">
        <p className="sd-focus font-urdu text-2xl leading-[2] text-lantern-soft sm:text-3xl" lang="ur" dir="rtl">
          جب وہ نہ رہیں، تو یہ کہانی کون سنائے گا؟
        </p>
        <h2 className="font-display mt-2 text-4xl font-semibold leading-tight text-moon sm:text-6xl">
          {QUESTION.split(" ").map((word, i) => (
            <span key={i} className="sd-word" style={{ "--i": i } as React.CSSProperties}>
              {word}{" "}
            </span>
          ))}
        </h2>
        <p className="sd-focus mx-auto mt-8 max-w-xl text-lg leading-relaxed text-moon/80">
          Most of what our grandparents lived through was never written down. It lives in how they tell it, in their language,
          at their pace. Baithak helps the youngest person in the family become its historian.
        </p>
      </div>
    </section>
  );
}

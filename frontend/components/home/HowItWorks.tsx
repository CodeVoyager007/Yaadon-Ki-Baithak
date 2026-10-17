import { BookOpen, Mic, NotebookPen } from "lucide-react";

const STEPS = [
  {
    icon: Mic,
    title: "Sit together",
    body: "Open Baithak, add your Nani or Dada and pick a topic. Hudhud asks one gentle question at a time, aloud in Urdu. They just talk.",
  },
  {
    icon: NotebookPen,
    title: "Hudhud listens and decides",
    body: "He follows the details they mention, picks up on cues that a memory might hurt and slows down — and always shows what he noticed.",
  },
  {
    icon: BookOpen,
    title: "A chapter appears",
    body: "A story writer uses only their words, an illustrator paints the scene, and their real voice stays beside the page, ready to share.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="relative scroll-mt-24 px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="font-urdu text-2xl leading-[2] text-lantern-soft" lang="ur" dir="rtl" style={{ textAlign: "left" }}>
          ایک شام، ایک چائے، ایک باب
        </p>
        <h2 id="how-title" className="font-display text-4xl font-semibold leading-tight text-moon sm:text-5xl">
          One evening, one cup of chai, one chapter.
        </h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="glass-night rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lantern/15 text-lantern-soft">
                  <Icon size={21} aria-hidden />
                </span>
                <span className="font-pixel text-sm text-lantern">Step {i + 1}</span>
              </div>
              <h3 className="font-display mt-4 text-2xl text-moon">{title}</h3>
              <p className="mt-2 leading-relaxed text-moon/80">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

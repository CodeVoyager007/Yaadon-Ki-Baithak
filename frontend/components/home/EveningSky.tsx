import { seeded } from "@/lib/random";

/**
 * The whole home page is one evening. This sky sits behind every section and
 * spans the full page height: the sun has just set at the top (the laali glow
 * lives on the hero's horizon), and it deepens into night towards the bottom,
 * where the stars thicken. Scrolling down simply is the evening passing, so it
 * needs no scroll code, works in every browser and costs nothing to scroll.
 */
export function EveningSky() {
  const r = seeded(1947);
  // More stars, and brighter ones, the further down the page (the later the hour).
  const stars = Array.from({ length: 140 }, (_, i) => {
    const depth = Math.sqrt(r()); // biased towards the bottom
    return {
      key: i,
      left: r() * 100,
      top: 8 + depth * 90,
      size: r() > 0.88 ? 3 : 2,
      opacity: 0.15 + depth * 0.7,
      delay: r() * 5,
    };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#3b2c5e_0%,#2b2d5c_14%,#1d1e4a_32%,#15163d_55%,#0e0f30_78%,#0a0a24_100%)]" />
      {stars.map((s) => (
        <span
          key={s.key}
          // Only the few bright stars twinkle: cheap on low-end phones, and the rest keep their depth.
          className={`absolute rounded-[1px] bg-moon ${s.size === 3 ? "motion-safe:animate-[twinkle_4s_ease-in-out_infinite]" : ""}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

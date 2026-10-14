import { seeded } from "@/lib/random";

/** A sparse field of pixel stars so the night carries on below the hero. */
export function StarDust({ count = 60, seed = 3 }: { count?: number; seed?: number }) {
  const r = seeded(seed);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const size = r() > 0.8 ? 3 : 2;
        return (
          <span
            key={i}
            className="anim-twinkle absolute bg-moon"
            style={{
              left: `${r() * 100}%`,
              top: `${r() * 100}%`,
              width: size,
              height: size,
              opacity: 0.5,
              animationDelay: `${r() * 4}s`,
              animationDuration: `${2.5 + r() * 3}s`,
            }}
          />
        );
      })}
    </div>
  );
}

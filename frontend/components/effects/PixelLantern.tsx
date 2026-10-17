/**
 * Pixel-art lantern that fills with light from the bottom up.
 * Used anywhere the app is waiting: signing in, Birdy writing a chapter.
 */
const SHAPE = [
  "...dddd...",
  "....dd....",
  "..ffffff..",
  ".f......f.",
  "f........f",
  "f........f",
  "f........f",
  "f........f",
  "f........f",
  ".f......f.",
  "..ffffff..",
  "...dddd...",
];

export function PixelLantern({ size = 32, className }: { size?: number; className?: string }) {
  const cols = SHAPE[0].length;
  const rows = SHAPE.length;
  const inside: { x: number; y: number }[] = [];
  SHAPE.forEach((row, y) => {
    const first = row.indexOf("f");
    const last = row.lastIndexOf("f");
    if (first === -1 || last - first < 2) return;
    for (let x = first + 1; x < last; x++) inside.push({ x, y });
  });
  const lastRow = Math.max(...inside.map((p) => p.y));
  const firstRow = Math.min(...inside.map((p) => p.y));
  const span = lastRow - firstRow + 1;

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      width={(size * cols) / rows}
      height={size}
      className={`pixelated ${className ?? ""}`}
      role="img"
      aria-label="Loading"
    >
      {inside.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1.02}
          height={1.02}
          fill={y % 2 ? "#ffd666" : "#f2a93b"}
          style={{
            animation: "pixel-fill 1.6s steps(1) infinite",
            animationDelay: `${((lastRow - y) / span) * 0.8}s`,
          }}
        />
      ))}
      {SHAPE.flatMap((row, y) =>
        row.split("").map((ch, x) =>
          ch === "." ? null : <rect key={`o${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={ch === "d" ? "#5a2a1a" : "#3b2a20"} />,
        ),
      )}
      <style>{`@keyframes pixel-fill { 0% { opacity: 0.15; } 50% { opacity: 1; } 100% { opacity: 0.15; } }`}</style>
    </svg>
  );
}

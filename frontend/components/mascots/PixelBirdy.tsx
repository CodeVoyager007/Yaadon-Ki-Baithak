/**
 * Hudhud as a 16x14 pixel-art sprite, for loaders, badges and small spots.
 * Each character in SPRITE maps to a colour in PALETTE ("." is empty).
 */
const SPRITE = [
  "......rrrr......",
  "....rrrrrrrr....",
  "...rrrrrrrrrr...",
  "..rrrrrrrrkkr...",
  "..rrrrrrrrkWryy.",
  "..rrrrrrrrrrrYY.",
  ".dwwwrrrrrrrrr..",
  "ddwRwwrrrrrrrr..",
  "ddwwwwgggggggr..",
  ".dwwwgggggggg...",
  "...ggggggggggg..",
  "....gggggggggg..",
  ".....G.....G....",
  "....oo....oo....",
];

const PALETTE: Record<string, string> = {
  r: "#f0654f",
  R: "#d9473a",
  g: "#c9c4d2",
  G: "#8f8a99",
  w: "#4f9a52",
  k: "#16121c",
  W: "#ffffff",
  y: "#ffd666",
  Y: "#d98a1e",
  o: "#f29a3a",
  d: "#3a3546",
};

export function PixelBirdy({ scale = 4, hop = false, className }: { scale?: number; hop?: boolean; className?: string }) {
  const w = SPRITE[0].length;
  const h = SPRITE.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      className={`pixelated ${hop ? "anim-hop" : ""} ${className ?? ""}`}
      aria-hidden
    >
      {SPRITE.flatMap((row, y) =>
        row.split("").map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={PALETTE[ch]} />,
        ),
      )}
    </svg>
  );
}

import { seeded } from "@/lib/random";

const W = 1440;
const H = 300;

/* Colours: far layer is hazy and light, front layer is nearly black. */
const FAR = "#3a2f63";
const MID = "#24224f";
const FRONT_C = "#0f0e2b";

type Block = { x: number; w: number; h: number };

/**
 * Old Karachi apartment blocks (Saddar, Kharadar, Burns Road).
 * Kept low around Mazar-e-Quaid and Empress Market so the landmarks read.
 */
function frontRow(): Block[] {
  const r = seeded(11);
  const out: Block[] = [];
  let x = -10;
  while (x < W + 20) {
    const w = 70 + Math.round(r() * 80);
    const mid = x + w / 2;
    const nearMazar = mid > 560 && mid < 840;
    const nearMarket = mid > 400 && mid < 560;
    const h = nearMazar ? 34 + Math.round(r() * 18) : nearMarket ? 50 + Math.round(r() * 20) : 64 + Math.round(r() * 62);
    out.push({ x, w, h });
    x += w + Math.round(r() * 6);
  }
  return out;
}
const FRONT = frontRow();

/** Sagging curve between two points, with points along it. */
function sag(x1: number, y1: number, x2: number, y2: number, drop: number, n: number) {
  const cx = (x1 + x2) / 2;
  const cy = Math.max(y1, y2) + drop;
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push({
      x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2,
      y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2,
    });
  }
  return { d: `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, pts };
}

const BULBS = ["#ffd666", "#f0654f", "#7cc27a", "#ffd666", "#f2a93b"];
const CLOTHES = ["#c8553d", "#5c8a5a", "#f2a93b", "#7c6bb0", "#e9e3f5", "#2f7fb5"];
// Warm bulbs and the greenish-white tube lights you see in every Karachi window.
const WINDOW_LIGHTS = ["#f2a93b", "#ffd58a", "#ffd58a", "#d8f7e6"];

/** Electric poles carrying the famous tangle of wires. */
const POLES = [150, 395, 610, 860, 1080, 1330];

/** Moorish pointed arch, like the openings of Mazar-e-Quaid. */
function arch(x: number, bottom: number, w: number, h: number) {
  const top = bottom - h;
  return `M${x} ${bottom} V${top + w * 0.55} Q${x} ${top + w * 0.08} ${x + w / 2} ${top} Q${x + w} ${top + w * 0.08} ${x + w} ${top + w * 0.55} V${bottom} Z`;
}

/**
 * Karachi at night: Masjid-e-Tooba and Habib Bank Plaza on the left,
 * Empress Market's clock tower, Mazar-e-Quaid glowing white in the middle,
 * Bahria Icon and the port cranes on the right, and old apartment blocks
 * in front with water tanks, dish antennas, washing lines, tangled wires,
 * a stuck kite, wedding lights and a rickshaw driving by.
 */
export function Rooftops() {
  const r = seeded(21);
  const top = (b: Block) => H - b.h;

  const weddings = [
    sag(FRONT[1].x + FRONT[1].w - 6, top(FRONT[1]) + 4, FRONT[2].x + 6, top(FRONT[2]) + 4, 26, 12),
    sag(FRONT[12].x + FRONT[12].w - 6, top(FRONT[12]) + 4, FRONT[13].x + 8, top(FRONT[13]) + 4, 24, 11),
  ];
  const laundry = sag(FRONT[3].x + FRONT[3].w - 4, top(FRONT[3]) + 18, FRONT[4].x + 4, top(FRONT[4]) + 18, 14, 7);

  // Three wires per span, each with a different sag, so it looks tangled.
  const wires: string[] = [];
  for (let i = 0; i < POLES.length - 1; i++) {
    for (let k = 0; k < 3; k++) {
      wires.push(sag(POLES[i], 146 + k * 6, POLES[i + 1], 146 + k * 6, 14 + k * 9 + r() * 10, 2).d);
    }
  }
  const kiteWire = sag(POLES[2], 152, POLES[3], 152, 23, 10);
  const kite = kiteWire.pts[6];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className="skyline block h-[clamp(150px,30vh,300px)] w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="mazar-glow">
          <stop offset="0%" stopColor="#fff4dc" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff4dc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="marble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbf7ff" />
          <stop offset="60%" stopColor="#d9d1ee" />
          <stop offset="100%" stopColor="#a99fcb" />
        </linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ---------- far layer: towers and the port ---------- */}
      <g fill={FAR}>
        {/* Habib Bank Plaza */}
        <rect x={296} y={70} width={44} height={230} />
        <rect x={304} y={60} width={28} height={12} />
        {/* generic towers */}
        <rect x={250} y={150} width={40} height={150} />
        <rect x={980} y={130} width={56} height={170} />
        <rect x={1040} y={170} width={50} height={130} />
        {/* Bahria Icon, with its slanted top, and its smaller twin */}
        <path d="M1100 300 V58 L1150 26 V300 Z" />
        <path d="M1156 300 V140 L1188 120 V300 Z" />
        {/* port cranes */}
        <g>
          <rect x={1262} y={150} width={6} height={150} />
          <rect x={1300} y={150} width={6} height={150} />
          <rect x={1236} y={142} width={120} height={9} />
          <path d="M1262 142 L1284 104 L1306 142" stroke={FAR} strokeWidth={5} fill="none" />
          <rect x={1374} y={170} width={6} height={130} />
          <rect x={1410} y={170} width={6} height={130} />
          <rect x={1350} y={162} width={100} height={8} />
          <path d="M1374 162 L1395 128 L1416 162" stroke={FAR} strokeWidth={5} fill="none" />
        </g>
      </g>
      {/* aviation lights */}
      <g fill="#ff4d3d" className="anim-twinkle">
        <rect x={1146} y={20} width={5} height={5} />
        <rect x={316} y={54} width={5} height={5} style={{ animationDelay: "0.8s" }} />
        <rect x={1282} y={98} width={4} height={4} style={{ animationDelay: "1.4s" }} />
        <rect x={1393} y={122} width={4} height={4} style={{ animationDelay: "0.4s" }} />
      </g>
      {/* a few lit office floors */}
      <g fill="#ffd58a" opacity="0.55">
        {[90, 120, 170, 210].map((y) => (
          <rect key={y} x={302} y={y} width={32} height={3} />
        ))}
        {[80, 110, 160, 200, 240].map((y) => (
          <rect key={y} x={1108} y={y} width={34} height={3} />
        ))}
      </g>

      {/* ---------- middle layer: the landmarks ---------- */}
      <g fill={MID}>
        {/* Masjid-e-Tooba: one wide, low dome and a single tall minaret */}
        <rect x={40} y={244} width={200} height={56} />
        <path d="M44 246 Q140 176 236 246 Z" />
        <rect x={248} y={66} width={13} height={234} />
        <rect x={242} y={118} width={25} height={6} />
        <rect x={244} y={84} width={21} height={5} />
        <path d="M248 66 L254.5 38 L261 66 Z" />

        {/* Empress Market: Gothic hall with its clock tower */}
        <rect x={380} y={206} width={186} height={94} />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${384 + i * 21} 206 l5 -12 l5 12 Z`} />
        ))}
        <rect x={457} y={84} width={32} height={124} />
        <path d="M452 86 L473 40 L494 86 Z" />
        <rect x={452} y={84} width={42} height={6} />
        <path d="M455 84 l3 -10 l3 10 Z M485 84 l3 -10 l3 10 Z" />
      </g>
      {/* clock face, lit */}
      <circle cx={473} cy={110} r={9} fill="#ffe9b0" />
      <path d="M473 110 V104 M473 110 L477 112" stroke="#6b5546" strokeWidth={1.6} strokeLinecap="round" />
      {/* lit arched windows of the market hall */}
      <g fill="#f2a93b" opacity="0.7">
        {[392, 416, 506, 530].map((x) => (
          <path key={x} d={arch(x, 250, 12, 26)} />
        ))}
      </g>

      {/* Mazar-e-Quaid, floodlit white marble on its platform */}
      <ellipse cx={690} cy={170} rx={190} ry={120} fill="url(#mazar-glow)" />
      <path d="M560 300 L590 232 H790 L820 300 Z" fill={MID} />
      <g fill="url(#marble)">
        <rect x={612} y={160} width={156} height={74} />
        <rect x={606} y={154} width={168} height={8} />
        <path d="M624 156 C624 110 656 92 690 88 C724 92 756 110 756 156 Z" />
        <rect x={688} y={70} width={4} height={20} />
      </g>
      {/* soft shading on the dome's right side */}
      <path d="M690 88 C724 92 756 110 756 156 H716 C716 120 706 98 690 88 Z" fill="#7d72a8" opacity="0.35" />
      {/* the three tall arches, with a warm glow inside */}
      <g fill="#3a2f63">
        <path d={arch(628, 234, 28, 58)} />
        <path d={arch(676, 234, 28, 58)} />
        <path d={arch(724, 234, 28, 58)} />
      </g>
      <g fill="#f2a93b" opacity="0.35">
        <path d={arch(634, 234, 16, 40)} />
        <path d={arch(682, 234, 16, 40)} />
        <path d={arch(730, 234, 16, 40)} />
      </g>

      {/* ---------- front layer: old apartment blocks ---------- */}
      <g fill={FRONT_C}>
        {FRONT.map((b, i) => {
          const t = top(b);
          const tanks = b.w > 90 ? 2 : 1;
          return (
            <g key={i}>
              <rect x={b.x} y={t} width={b.w} height={b.h} />
              <rect x={b.x - 3} y={t - 4} width={b.w + 6} height={5} />
              {/* black plastic water tanks */}
              {i % 2 === 0 &&
                Array.from({ length: tanks }, (_, k) => (
                  <g key={k}>
                    <rect x={b.x + 10 + k * 22} y={t - 24} width={17} height={20} rx={4} />
                    <rect x={b.x + 14 + k * 22} y={t - 28} width={9} height={5} rx={2} />
                  </g>
                ))}
              {/* dish antenna */}
              {i % 3 === 1 && (
                <g transform={`translate(${b.x + b.w - 22} ${t - 12}) rotate(-28)`}>
                  <ellipse cx={0} cy={0} rx={10} ry={4.5} />
                  <rect x={-1} y={0} width={2.5} height={12} />
                </g>
              )}
              {/* balconies */}
              {b.h > 70 &&
                [30, 64].map((dy) => (
                  <rect key={dy} x={b.x + 6} y={t + dy} width={b.w - 12} height={4} fill="#1d1b44" />
                ))}
            </g>
          );
        })}
        {/* electric poles */}
        {POLES.map((x) => (
          <g key={x}>
            <rect x={x - 2} y={138} width={4} height={162} />
            <rect x={x - 12} y={144} width={24} height={3} />
          </g>
        ))}
      </g>

      {/* lit windows: warm bulbs and tube lights */}
      <g>
        {FRONT.flatMap((b, i) => {
          const t = top(b);
          const cols = Math.max(1, Math.floor((b.w - 16) / 18));
          const rows = Math.max(1, Math.floor((b.h - 14) / 34));
          const out = [];
          for (let c = 0; c < cols; c++) {
            for (let rr = 0; rr < rows; rr++) {
              if (r() > 0.4) continue;
              const flicker = r() > 0.8;
              out.push(
                <rect
                  key={`${i}-${c}-${rr}`}
                  x={b.x + 10 + c * 18}
                  y={t + 12 + rr * 34}
                  width={7}
                  height={11}
                  fill={WINDOW_LIGHTS[Math.floor(r() * WINDOW_LIGHTS.length)]}
                  className={flicker ? "anim-flicker" : undefined}
                  style={flicker ? { animationDelay: `${r() * 4}s` } : undefined}
                />,
              );
            }
          }
          return out;
        })}
      </g>

      {/* the wire tangle */}
      <g stroke="#08081c" strokeWidth={1.3} fill="none" opacity="0.9">
        {wires.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* a patang stuck on the wire since Basant */}
      <g transform={`translate(${kite.x} ${kite.y}) rotate(18)`}>
        <path d="M0 -14 L11 0 L0 14 L-11 0 Z" fill="#f0654f" />
        <path d="M0 -14 L11 0 L0 14 Z" fill="#ffd666" />
        <path d="M-11 0 H11 M0 -14 V14" stroke="#7a2a1c" strokeWidth={1} />
        <path d="M0 14 q-4 8 2 14 q5 6 0 12" stroke="#f2a93b" strokeWidth={1.2} fill="none" />
      </g>

      {/* washing line */}
      <path d={laundry.d} stroke="#3d3a62" strokeWidth={1.2} fill="none" />
      {laundry.pts.map((p, i) => (
        <rect key={i} x={p.x - 5} y={p.y} width={10} height={i % 2 ? 16 : 22} fill={CLOTHES[i % CLOTHES.length]} opacity={0.85} />
      ))}

      {/* wedding lights */}
      {weddings.map((s, i) => (
        <g key={i}>
          <path d={s.d} stroke="#4a4466" strokeWidth={1.4} fill="none" />
          {s.pts.map((p, j) => (
            <rect
              key={j}
              x={p.x - 3.5}
              y={p.y - 3.5}
              width={7}
              height={7}
              fill={BULBS[(i + j) % BULBS.length]}
              className="anim-twinkle"
              style={{ animationDelay: `${(j % 4) * 0.4}s`, filter: "drop-shadow(0 0 4px rgba(255,214,102,0.9))" }}
            />
          ))}
        </g>
      ))}

      {/* a rickshaw puttering past */}
      <g className="anim-drive">
        <rect x={20} y={286} width={70} height={10} fill="url(#beam)" />
        <path d="M-30 296 V274 Q-30 262 -18 262 H4 Q14 262 16 272 L20 286 V296 Z" fill="#0a0a20" />
        <rect x={-26} y={268} width={14} height={10} rx={2} fill="#ffd58a" opacity="0.5" />
        <rect x={-34} y={286} width={4} height={4} fill="#ff4d3d" />
        <rect x={16} y={284} width={4} height={4} fill="#fff1c2" />
        <circle cx={-18} cy={297} r={4} fill="#05050f" />
        <circle cx={10} cy={297} r={4} fill="#05050f" />
      </g>
    </svg>
  );
}

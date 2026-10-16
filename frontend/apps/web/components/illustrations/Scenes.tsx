/**
 * Small gouache-style scenes for sample chapters. Placeholders until the
 * real FLUX illustrations come from the illustrator agent.
 */
type SceneProps = { className?: string };

const frame = { viewBox: "0 0 320 200", preserveAspectRatio: "xMidYMid slice" } as const;

export function TrainScene({ className }: SceneProps) {
  return (
    <svg {...frame} className={className} aria-hidden>
      <defs>
        <linearGradient id="tr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1c48" />
          <stop offset="1" stopColor="#5b3a62" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#tr-sky)" />
      <circle cx="170" cy="40" r="16" fill="#fff4dc" opacity="0.9" />
      <g fill="#fff4dc" opacity="0.8">
        <rect x="40" y="30" width="3" height="3" /><rect x="120" y="18" width="2" height="2" /><rect x="190" y="50" width="3" height="3" />
      </g>
      <g fill="#c9b9d6" opacity="0.5">
        <circle cx="70" cy="86" r="14" /><circle cx="52" cy="70" r="11" /><circle cx="38" cy="56" r="8" />
      </g>
      <rect y="168" width="320" height="32" fill="#2a1f2c" />
      <rect y="164" width="320" height="4" fill="#6b5546" />
      <g fill="#120f24">
        <rect x="60" y="112" width="70" height="50" rx="4" />
        <rect x="76" y="94" width="14" height="20" />
        <rect x="134" y="118" width="80" height="44" rx="3" />
        <rect x="218" y="118" width="80" height="44" rx="3" />
        <path d="M138 118 q6 -8 12 0 q6 -9 12 0 q6 -7 12 0 q6 -9 12 0 q6 -8 12 0 q6 -8 12 0 Z" />
        <path d="M222 118 q6 -8 12 0 q6 -9 12 0 q6 -7 12 0 q6 -9 12 0 q6 -8 12 0 q6 -8 12 0 Z" />
      </g>
      <g fill="#f2a93b">
        {[144, 164, 184, 228, 248, 268].map((x) => (
          <rect key={x} x={x} y="128" width="12" height="12" />
        ))}
      </g>
      <g fill="#1d1830">
        {[76, 108, 150, 196, 236, 280].map((x) => (
          <circle key={x} cx={x} cy="164" r="8" />
        ))}
      </g>
    </svg>
  );
}

export function DoorwayScene({ className }: SceneProps) {
  return (
    <svg {...frame} className={className} aria-hidden>
      <rect width="320" height="200" fill="#2b2d5c" />
      <rect x="0" y="150" width="320" height="50" fill="#3a2b3e" />
      <rect x="40" y="20" width="240" height="160" fill="#4a3654" />
      <path d="M110 180 V80 Q160 20 210 80 V180 Z" fill="#ffd58a" />
      <path d="M110 180 V80 Q160 20 210 80 V180 Z" fill="url(#door-light)" />
      <defs>
        <radialGradient id="door-light" cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset="1" stopColor="#f2a93b" />
        </radialGradient>
      </defs>
      <path d="M110 180 V80 Q125 60 140 52 V180 Z" fill="#7a3a22" />
      <path d="M210 180 V80 Q195 60 180 52 V180 Z" fill="#7a3a22" />
      <path d="M150 180 L130 200 H190 L170 180 Z" fill="#ffd58a" opacity="0.5" />
      <g fill="#2a1f2c">
        <circle cx="160" cy="118" r="9" />
        <path d="M148 180 Q148 132 160 130 Q172 132 172 180 Z" />
      </g>
    </svg>
  );
}

export function TramScene({ className }: SceneProps) {
  return (
    <svg {...frame} className={className} aria-hidden>
      <defs>
        <linearGradient id="tm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a93b" />
          <stop offset="1" stopColor="#c8553d" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#tm-sky)" />
      <circle cx="80" cy="70" r="26" fill="#ffd58a" />
      <g fill="#7a3a33">
        <rect x="0" y="80" width="60" height="100" /><rect x="230" y="60" width="90" height="120" />
        <path d="M250 60 l10 -14 h30 l10 14 Z" />
      </g>
      <rect y="170" width="320" height="30" fill="#4a2a2a" />
      <path d="M0 176 H320" stroke="#c9a77a" strokeWidth="2" />
      <path d="M40 40 H300" stroke="#3b2a20" strokeWidth="1.5" />
      <path d="M150 40 L162 100" stroke="#3b2a20" strokeWidth="2" />
      <rect x="96" y="100" width="140" height="66" rx="8" fill="#2f5d4a" />
      <rect x="96" y="100" width="140" height="12" rx="6" fill="#244a3a" />
      <g fill="#ffd58a">
        {[108, 136, 164, 192].map((x) => (
          <rect key={x} x={x} y="118" width="22" height="20" rx="2" />
        ))}
      </g>
      <rect x="216" y="118" width="12" height="44" fill="#1d3a2e" />
      <g fill="#2a1f2c"><circle cx="122" cy="168" r="7" /><circle cx="210" cy="168" r="7" /></g>
    </svg>
  );
}

export function RiverScene({ className }: SceneProps) {
  return (
    <svg {...frame} className={className} aria-hidden>
      <defs>
        <linearGradient id="rv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12133a" />
          <stop offset="1" stopColor="#2b2d5c" />
        </linearGradient>
        <linearGradient id="rv-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3a6e" />
          <stop offset="1" stopColor="#141a3c" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#rv-sky)" />
      <circle cx="220" cy="46" r="16" fill="#fff4dc" />
      <path d="M0 96 Q80 84 160 94 T320 92 V200 H0 Z" fill="url(#rv-water)" />
      <g stroke="#fff4dc" strokeWidth="2" opacity="0.55">
        <path d="M200 112 h40 M206 124 h28 M212 136 h16" />
      </g>
      <g stroke="#8fa0d8" strokeWidth="1.5" opacity="0.4" fill="none">
        <path d="M20 130 q20 -6 40 0 M240 160 q20 -6 40 0 M60 170 q20 -6 40 0" />
      </g>
      <ellipse cx="120" cy="140" rx="24" ry="20" fill="#b5532f" />
      <ellipse cx="120" cy="124" rx="10" ry="4" fill="#7a3a22" />
      <path d="M106 140 Q120 148 134 140" stroke="#e8b48a" strokeWidth="2" fill="none" />
      <g fill="#1d1830">
        <circle cx="120" cy="104" r="7" />
        <path d="M110 128 Q120 106 130 128 Z" />
      </g>
    </svg>
  );
}

export function EidScene({ className }: SceneProps) {
  return (
    <svg {...frame} className={className} aria-hidden>
      <rect width="320" height="200" fill="#f3e3c6" />
      <rect x="200" y="20" width="90" height="90" rx="45" fill="#2b2d5c" />
      <path d="M262 46 a22 22 0 1 0 6 34 a17 17 0 1 1 -6 -34 Z" fill="#fff4dc" />
      <rect y="150" width="320" height="50" fill="#c8553d" opacity="0.25" />
      <g stroke="#9e2b25" strokeWidth="3" opacity="0.6">
        <path d="M0 160 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8" fill="none" />
      </g>
      <ellipse cx="120" cy="150" rx="70" ry="16" fill="#8a6a3a" />
      <path d="M50 134 Q120 200 190 134 Z" fill="#d9c08a" />
      <ellipse cx="120" cy="134" rx="70" ry="14" fill="#fff1d6" />
      <g fill="#c9a24f">
        <rect x="96" y="128" width="6" height="3" /><rect x="128" y="132" width="5" height="3" /><rect x="114" y="136" width="4" height="3" />
      </g>
      <g stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M104 116 q-8 -12 0 -24 M124 112 q-8 -12 0 -24 M144 116 q-8 -12 0 -24" />
      </g>
    </svg>
  );
}

export function DholkiScene({ className }: SceneProps) {
  return (
    <svg {...frame} className={className} aria-hidden>
      <rect width="320" height="200" fill="#4a3366" />
      <path d="M0 30 Q80 60 160 30 T320 30" stroke="#2e2a4a" strokeWidth="1.5" fill="none" />
      <g>
        {[20, 50, 80, 110, 140, 180, 210, 240, 270, 300].map((x, i) => (
          <rect key={x} x={x} y={38 + Math.sin(i) * 6} width="6" height="6" fill={["#ffd666", "#f0654f", "#7cc27a"][i % 3]} />
        ))}
      </g>
      <g fill="#f2a93b">
        {[40, 70, 100, 220, 250, 280].map((x) => (
          <circle key={x} cx={x} cy="70" r="7" />
        ))}
      </g>
      <rect y="160" width="320" height="40" fill="#2a1f3c" />
      <rect x="100" y="110" width="120" height="56" rx="26" fill="#b5532f" />
      <ellipse cx="100" cy="138" rx="12" ry="28" fill="#f3e3c6" />
      <ellipse cx="220" cy="138" rx="12" ry="28" fill="#e8d4b0" />
      <g stroke="#3b2a20" strokeWidth="1.5">
        <path d="M110 112 L210 164 M110 164 L210 112 M130 110 L190 166 M130 166 L190 110" />
      </g>
    </svg>
  );
}

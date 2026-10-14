/**
 * Inside the app it stays night: a deep indigo room lit by soft pools
 * of lantern light that the frosted glass panels sit over.
 */
export function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(180deg,#0c0d2e_0%,#12133a_45%,#1d1c48_100%)]">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-lantern/20 blur-[130px]" />
      <div className="absolute -right-32 top-1/3 h-[460px] w-[460px] rounded-full bg-jamuni/40 blur-[130px]" />
      <div className="absolute bottom-[-180px] left-1/3 h-[420px] w-[520px] rounded-full bg-terracotta/15 blur-[130px]" />
      <div
        className="absolute inset-x-0 top-0 h-3 opacity-80"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #9e2b25 0 12px, #3b2a20 12px 16px, #9e2b25 16px 28px, #f2a93b 28px 32px)",
        }}
      />
    </div>
  );
}

/** Thin ajrak block-print border, used around the family book cover. */
export const AJRAK_BORDER = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='#9e2b25'/><rect x='9' y='0' width='6' height='6' fill='#3b2a20'/><rect x='9' y='18' width='6' height='6' fill='#3b2a20'/><rect x='0' y='9' width='6' height='6' fill='#3b2a20'/><rect x='18' y='9' width='6' height='6' fill='#3b2a20'/><rect x='10' y='10' width='4' height='4' fill='#fbf3e4'/></svg>",
  )}")`,
} as const;

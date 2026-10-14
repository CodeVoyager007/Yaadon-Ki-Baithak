import skyline from "./karachi-skyline.jpg";

/**
 * Depth behind the lower home sections: the Karachi painting, heavily
 * blurred and dimmed like an out-of-focus background in a film shot,
 * with warm lantern pools and a vignette. Static, so it costs nothing to scroll.
 */
export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={skyline.src} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.16] blur-[60px] saturate-150" />
      <div className="absolute left-[-10%] top-[8%] h-[40vw] w-[40vw] rounded-full bg-lantern/10 blur-[140px]" />
      <div className="absolute right-[-12%] top-[38%] h-[45vw] w-[45vw] rounded-full bg-terracotta/10 blur-[160px]" />
      <div className="absolute left-[20%] bottom-[5%] h-[35vw] w-[50vw] rounded-full bg-jamuni/30 blur-[160px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_40%,rgba(5,5,20,0.65)_100%)]" />
    </div>
  );
}

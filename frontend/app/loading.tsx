import { PixelLantern } from "@/components/effects/PixelLantern";

export default function Loading() {
  return (
    <div className="grid min-h-[100svh] place-items-center bg-raat" aria-busy="true">
      <PixelLantern size={56} />
    </div>
  );
}

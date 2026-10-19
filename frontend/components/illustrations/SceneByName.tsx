import type { StaticImageData } from "next/image";
import type { SampleChapter } from "@/lib/samples";
import dholki from "./scenes/dholki.webp";
import doorway from "./scenes/doorway.webp";
import eid from "./scenes/eid.webp";
import river from "./scenes/river.webp";
import train from "./scenes/train.webp";
import tram from "./scenes/tram.webp";

/** Painted scenes, one per story theme. Same art style as the skyline and the tale cards. */
export const SCENE_IMAGES: Record<SampleChapter["scene"], StaticImageData> = { train, doorway, tram, river, eid, dholki };

export function SceneByName({ name, className }: { name: SampleChapter["scene"]; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SCENE_IMAGES[name].src} alt="" loading="lazy" decoding="async" className={`object-cover ${className ?? ""}`} />
  );
}

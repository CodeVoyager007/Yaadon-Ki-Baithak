import type { StaticImageData } from "next/image";
import type { SampleChapter } from "@/lib/samples";
import dholki from "./scenes/dholki.jpg";
import doorway from "./scenes/doorway.jpg";
import eid from "./scenes/eid.jpg";
import river from "./scenes/river.jpg";
import train from "./scenes/train.jpg";
import tram from "./scenes/tram.jpg";

/** Painted scenes, one per story theme. Same art style as the skyline and the tale cards. */
export const SCENE_IMAGES: Record<SampleChapter["scene"], StaticImageData> = { train, doorway, tram, river, eid, dholki };

export function SceneByName({ name, className }: { name: SampleChapter["scene"]; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SCENE_IMAGES[name].src} alt="" loading="lazy" decoding="async" className={`object-cover ${className ?? ""}`} />
  );
}

"use client";

import { useEffect, useState } from "react";
import { getImage, IDB_PREFIX } from "@/lib/image-store";

/**
 * A storybook painting. Resolves paintings kept on this device ("idb:<id>"),
 * and falls back to the page's themed picture if the image can't be shown
 * (an expired link, cleared storage).
 */
export function StoryImage({ src, fallback, className, alt = "" }: { src: string; fallback: string; className?: string; alt?: string }) {
  const [shown, setShown] = useState(src.startsWith(IDB_PREFIX) ? fallback : src);

  useEffect(() => {
    if (!src.startsWith(IDB_PREFIX)) {
      setShown(src);
      return;
    }
    let url: string | null = null;
    let live = true;
    void getImage(src).then((blob) => {
      if (!live) return;
      if (!blob) return setShown(fallback);
      url = URL.createObjectURL(blob);
      setShown(url);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shown}
      alt={alt}
      onError={() => shown !== fallback && setShown(fallback)}
      className={className}
      draggable={false}
    />
  );
}

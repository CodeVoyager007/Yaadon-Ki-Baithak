"use client";

import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * True when the full "movie" scroll scenes should play: a large screen and
 * no reduced-motion preference. Pinned scenes feel bad on phones, so phones
 * get simpler reveals instead. Layout heights use matching CSS
 * (`lg:motion-safe:`) so nothing jumps after the page loads.
 */
export function useCinema() {
  const reduce = useReducedMotion();
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  return wide && !reduce;
}

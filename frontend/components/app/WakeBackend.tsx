"use client";

import { useEffect } from "react";
import { apiUrl, hasBackend } from "@/lib/api";

/**
 * Free backend hosts sleep when nobody has used them for a while and take up to a minute to wake.
 * One quiet ping when the site opens (once per tab) wakes the agents while the family is still
 * reading the home page, so they're ready by the time anyone records.
 */
export function WakeBackend() {
  useEffect(() => {
    if (!hasBackend) return;
    try {
      if (sessionStorage.getItem("baithak-woke")) return;
      sessionStorage.setItem("baithak-woke", "1");
    } catch {
      /* private mode: ping anyway */
    }
    void fetch(apiUrl("/health"), { mode: "no-cors", cache: "no-store" }).catch(() => {});
  }, []);
  return null;
}

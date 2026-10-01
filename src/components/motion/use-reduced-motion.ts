"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True when the visitor asked the OS for less motion. Server render assumes false. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Fine pointer with hover (desktop mouse/trackpad), used to gate pointer effects. */
export function canHoverPrecisely(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

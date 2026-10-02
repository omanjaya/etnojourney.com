/**
 * Motion toolkit. Rules:
 * - Content must be visible in server HTML; animations only enhance.
 * - Everything respects `prefers-reduced-motion` (CSS in globals.css + JS checks).
 * - Prefer these primitives over ad-hoc animation code or new libraries.
 */
export { Reveal, type RevealVariant } from "./reveal";
export { SplitWords } from "./split-words";
export { CountUp } from "./count-up";
export { Marquee } from "./marquee";
export { Tilt } from "./tilt";
export { Magnetic } from "./magnetic";
export { ImageFadeIn } from "./image-fade-in";
export { useReducedMotion } from "./use-reduced-motion";

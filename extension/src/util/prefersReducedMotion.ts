/**
 * True when the user has asked the OS to minimize animation. Guarded for
 * non-DOM contexts (tests, SSR) where `matchMedia` is absent.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

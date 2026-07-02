/**
 * Read the companion rest (px from the viewport bottom) back off a probe
 * element pinned via `bottom: var(--companion-bar-center-y)`. The CSS stays the
 * single source of truth and JS only reads the browser-resolved px, so every
 * surface that seats the sun on the bar anchor (the shell's reanchorCompanion,
 * the Android onboarding's measureAnchors) measures the exact same point.
 * Returns null while the computed style hasn't resolved to a finite px yet.
 */
export const readCompanionBottomPx = (probe: HTMLElement): number | null => {
  const bottomPx = parseFloat(getComputedStyle(probe).bottom);
  return Number.isFinite(bottomPx) ? bottomPx : null;
};

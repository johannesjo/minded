import type { SunSettle } from "./Sun";

/**
 * Pure geometry behind the sun's settle: where a settle's anchor lands in the
 * viewport, how big the disc rests there, and reading the disc's rendered
 * translate back off its transform. Kept out of Sun.tsx so the maths is
 * testable without a DOM and the orchestrator only wires it up.
 */
export interface SunPoint {
  x: number;
  y: number;
}

export const DEFAULT_ANCHOR_Y_RATIO = 0.4;
export const DEFAULT_REST_SCALE = 0.82;

/** The `translate(x, y)` a previous frame wrote, or null if none is set. */
export const parseRenderedTranslate = (transform: string): SunPoint | null => {
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(transform);
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
};

/**
 * The viewport point a settle's anchor names. The anchor is a fraction of the
 * viewport (x defaults to centred), unless a fixed px anchor is given - px wins
 * so the sun can land exactly on a fixed-px element (the Little Sun corner)
 * without drifting on wide viewports.
 */
export const anchorPointForSettle = (
  settle: SunSettle,
  viewport: { width: number; height: number },
): SunPoint => ({
  x:
    settle.anchorXRatio != null
      ? viewport.width * settle.anchorXRatio
      : (settle.anchorXPx ?? viewport.width * 0.5),
  y:
    settle.anchorYPxFromBottom != null
      ? viewport.height - settle.anchorYPxFromBottom
      : settle.anchorYPxFromTop != null
        ? settle.anchorYPxFromTop
        : viewport.height * (settle.anchorYRatio ?? DEFAULT_ANCHOR_Y_RATIO),
});

/**
 * A settle may pin an exact disc diameter (discPx) instead of a scale - the
 * departing hand-off does, so the disc lands at the Little Sun's real px size
 * on any viewport. Convert that to a scale of the base disc; otherwise use the
 * settle's explicit scale (or the default).
 */
export const restScaleForSettle = (
  settle: SunSettle,
  baseDiscPx: number,
): number =>
  settle.discPx != null
    ? settle.discPx / baseDiscPx
    : (settle.scale ?? DEFAULT_REST_SCALE);

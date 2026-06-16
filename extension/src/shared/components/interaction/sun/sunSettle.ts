import type { SunSettle } from "./Sun";

/**
 * Settle targets for the post-interaction sun, shared by the real flow
 * (InteractionCommon) and the styleguide harness so the two can't drift.
 * Tune the morph here.
 */

export type SunPhase = "interactive" | "breathing" | "resting" | "departing";

/** Breath pause: upper-middle, scaled down, one inhale→exhale over the pause. */
export const sunBreatheSettle = (breathSeconds: number): SunSettle => ({
  anchorYRatio: 0.4, // upper-middle, leaving room for the breath cue beneath
  scale: 0.82,
  breathe: true,
  breathSeconds,
});

/** Intent/time choices: a smaller, calmer anchor in the upper third. */
export const SUN_REST_SETTLE: SunSettle = {
  anchorYRatio: 0.26, // choices sit beneath it (see .has-resting-sun padding)
  scale: 0.56,
  breathe: false,
};

/**
 * Time chosen → the sun glides to the bottom-left corner and shrinks to roughly
 * the Little Sun's size, so the persistent timer reads as the same sun settling
 * in (it appears at this corner; see LittleSun). Tuned to ~the Little Sun's spot.
 */
export const SUN_DEPART_SETTLE: SunSettle = {
  anchorXRatio: 0.05,
  anchorYRatio: 0.94,
  scale: 0.34,
  breathe: false,
};

/**
 * Map a sun phase to its settle target. `interactive` returns null (the sun is
 * draggable, not settled). Pure so it can be unit-tested and reused verbatim by
 * the styleguide harness.
 */
export const getSunSettleForPhase = (
  phase: SunPhase,
  breathSeconds: number,
): SunSettle | null => {
  switch (phase) {
    case "breathing":
      return sunBreatheSettle(breathSeconds);
    case "resting":
      return SUN_REST_SETTLE;
    case "departing":
      return SUN_DEPART_SETTLE;
    default:
      return null;
  }
};

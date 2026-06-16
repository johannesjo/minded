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
 * The Little Sun's disc rests with its center 40px in from both the left and
 * bottom edges — measured from LittleSun.scss (`left: 40px`, `bottom: 0`, a 40px
 * disc centered by its bloom transform). The departing sun lands here so the
 * hand-off is seamless; keep in sync if that corner moves.
 */
const LITTLE_SUN_CORNER_PX = 40;

/**
 * Time chosen → the sun glides to the bottom-left corner and shrinks to roughly
 * the Little Sun's size, then the Little Sun blooms in place where it lands, so
 * the persistent timer reads as the very same sun settling in.
 *
 * Anchored in fixed px (not viewport ratios) to match the Little Sun's fixed
 * corner exactly — otherwise the two drift apart on wide monitors (a 5vw anchor
 * is 64px at 1280px but 128px at 2560px, while the Little Sun stays at 40px).
 */
export const SUN_DEPART_SETTLE: SunSettle = {
  anchorXPx: LITTLE_SUN_CORNER_PX,
  anchorYPxFromBottom: LITTLE_SUN_CORNER_PX,
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

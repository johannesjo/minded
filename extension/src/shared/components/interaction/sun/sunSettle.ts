import type { SunSettle } from "./Sun";

/**
 * Settle targets for the post-interaction sun, shared by the real flow
 * (InteractionCommon) and the styleguide harness so the two can't drift.
 * Tune the morph here.
 */

// "companion" is the idle home in the app shell (top-bar rest); the rest are the
// in-intervention phases. The shell sun and the interaction drive this same union
// through the sunStore, so one disc covers every state.
export type SunPhase =
  | "companion"
  | "interactive"
  | "breathing"
  | "resting"
  | "departing";

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
 * Companion rest: the idle home in the app-shell top bar. Anchored in fixed px
 * from the top (the measured `--companion-top-bar-center-y`) so it lands on the
 * top-bar anchor. No JS breath — the CSS idle-breath glow on `.minded-sun`
 * resumes on its own once the sun settles.
 */
/** Placeholder top-bar anchor used until MainWrapper measures the real px. */
export const DEFAULT_COMPANION_TOP_Y_PX = 44;

export const sunCompanionSettle = (topBarCenterYPx: number): SunSettle => ({
  anchorYPxFromTop: topBarCenterYPx,
  // ~0.42 of the interaction sun's base lands the companion at ~50px — the
  // footprint the top-bar band is centred around — rather than the 0.66 that
  // would nearly fill the band and crowd the dashboard cards.
  scale: 0.42,
  breathe: false,
});

/**
 * Map a sun phase to its settle target. `interactive` returns null (the sun is
 * draggable, not settled). Pure so it can be unit-tested and reused verbatim by
 * the styleguide harness. `companionTopYPx` is the measured top-bar anchor,
 * needed only for the "companion" phase.
 */
export const getSunSettleForPhase = (
  phase: SunPhase,
  breathSeconds: number,
  companionTopYPx = DEFAULT_COMPANION_TOP_Y_PX,
): SunSettle | null => {
  switch (phase) {
    case "companion":
      return sunCompanionSettle(companionTopYPx);
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

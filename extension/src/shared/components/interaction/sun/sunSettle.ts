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

/**
 * Interactive intervention: rest on the measured placeholder centre (full size,
 * no breath) so the draggable disc sits exactly in the slot the content flow
 * reserved for it. The anchor is a live viewport-px point (the disc follows the
 * layout), so unlike the other phases this settle can't be a static constant.
 */
export const sunInteractiveSettle = (anchor: {
  x: number;
  y: number;
}): SunSettle => ({
  anchorXPx: anchor.x,
  anchorYPxFromTop: anchor.y,
  scale: 1,
  breathe: false,
});

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
 * The Little Sun's disc rests with its center this many px in from both the left
 * and bottom edges; the departing sun lands there so the hand-off is seamless.
 *
 * The corner differs per platform because a different Little Sun takes over once
 * the interaction closes:
 * - Web extension: the SolidJS Little Sun (LittleSun.scss: `left: 40px`,
 *   `bottom: 0`, a 40px disc) → its centre sits ~40px in from both edges.
 * - Android: the *native* Little Sun overlay (LittleSun.kt / LittleSunWindow.kt)
 *   is a 60dp box pinned to the bottom-left corner (gravity START|BOTTOM, no
 *   offset) with a 30dp disc centred inside it → the disc centre sits ~30px in
 *   from both edges. The web extension's 40px target landed the departing sun
 *   ~10px too far right and up, so the native sun visibly jumped when it bloomed
 *   in. Keep these in sync if either Little Sun's corner moves.
 */
export const LITTLE_SUN_CORNER_PX_WEB = 40;
export const LITTLE_SUN_CORNER_PX_ANDROID = 30;

/**
 * Time chosen → the sun glides to the bottom-left corner and shrinks to roughly
 * the Little Sun's size, then the Little Sun blooms in place where it lands, so
 * the persistent timer reads as the very same sun settling in.
 *
 * Anchored in fixed px (not viewport ratios) to match the Little Sun's fixed
 * corner exactly — otherwise the two drift apart on wide monitors (a 5vw anchor
 * is 64px at 1280px but 128px at 2560px, while the Little Sun stays put).
 */
export const sunDepartSettle = (
  cornerPx: number = LITTLE_SUN_CORNER_PX_WEB,
): SunSettle => ({
  anchorXPx: cornerPx,
  anchorYPxFromBottom: cornerPx,
  scale: 0.34,
  breathe: false,
});

/** Default departing target (the web extension's SolidJS Little Sun corner). */
export const SUN_DEPART_SETTLE: SunSettle = sunDepartSettle();

/**
 * Companion rest: the idle home in the app shell, centred over the bottom bar.
 * Anchored in fixed px from the bottom (the measured `--companion-bar-center-y`)
 * so it lands on the bottom-bar anchor. No JS breath — the CSS idle-breath glow
 * on `.minded-sun` resumes on its own once the sun settles.
 */
/** Placeholder bottom-bar anchor used until MainWrapper measures the real px. */
export const DEFAULT_COMPANION_BOTTOM_Y_PX = 44;

export const sunCompanionSettle = (
  barCenterYPxFromBottom: number,
): SunSettle => ({
  anchorYPxFromBottom: barCenterYPxFromBottom,
  // ~0.42 of the interaction sun's base lands the companion at ~50px — the
  // footprint the bottom-bar band is centred around — rather than the 0.66 that
  // would nearly fill the band and crowd the icons either side.
  scale: 0.42,
  breathe: false,
});

/**
 * Map a sun phase to its settle target. `interactive` returns null (the sun is
 * draggable, not settled). Pure so it can be unit-tested and reused verbatim by
 * the styleguide harness. `companionBottomYPx` is the measured bottom-bar anchor,
 * needed only for the "companion" phase. `departCornerPx` is the Little Sun's
 * corner inset, needed only for the "departing" phase (defaults to the web
 * extension's corner; Android passes its native Little Sun's smaller corner).
 */
export const getSunSettleForPhase = (
  phase: SunPhase,
  breathSeconds: number,
  companionBottomYPx = DEFAULT_COMPANION_BOTTOM_Y_PX,
  departCornerPx: number = LITTLE_SUN_CORNER_PX_WEB,
): SunSettle | null => {
  switch (phase) {
    case "companion":
      return sunCompanionSettle(companionBottomYPx);
    case "breathing":
      return sunBreatheSettle(breathSeconds);
    case "resting":
      return SUN_REST_SETTLE;
    case "departing":
      return sunDepartSettle(departCornerPx);
    default:
      return null;
  }
};

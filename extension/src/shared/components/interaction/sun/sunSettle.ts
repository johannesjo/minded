import type { SunSettle } from "./Sun";
import {
  BREATH_PAUSE_PATTERN,
  SURF_WAVE_PATTERN,
} from "@src/shared/components/interaction/breathTimeline";

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
  | "surfing"
  | "resting"
  | "departing"
  // The daily-questions flow (morning inspiration / evening reflection) borrows
  // the one shell sun as its through-line instead of drawing its own discs: it
  // rests on the bottom bar as a calm companion (carrying the orbit progress
  // dots) while the questions are answered, then blooms into the closing sun.
  | "dailyQuestions"
  | "dailyQuestionsSuccess";

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

/** Breath pause: upper-middle, scaled down, one inhale→hold→exhale over the pause. */
export const sunBreatheSettle = (): SunSettle => ({
  anchorYRatio: 0.4, // upper-middle, leaving room for the breath cue beneath
  scale: 0.82,
  breathe: true,
  // Shape (and duration) of the breath come entirely from the pattern the cue
  // copy reads too, so the disc and the "Breathe in / Hold / Breathe out" text
  // move on the same beats.
  breathPattern: BREATH_PAUSE_PATTERN,
});

/**
 * Urge-surfing wave: ride the swell on the interactive disc itself. Breathe in
 * place on the measured interactive anchor (full size, no reposition) so the one
 * sun the user always sees does the rise-and-fall over the whole wave, rather
 * than a second disc being drawn over it.
 */
export const sunSurfSettle = (): SunSettle => ({
  // The meditation sun sits just above viewport centre; the cue is dropped to the
  // bottom of its box just below, so the disc + halo and the guidance read as one
  // group straddling the centre. A fixed viewport ratio (not the content
  // placeholder) keeps its position predictable.
  anchorYRatio: 0.38,
  scale: 1,
  breathe: true,
  // A gentle, continuous pulse for the meditation: every few seconds the disc
  // eases inward and back. The 5s symmetric wave (no held top) keeps this a
  // flowing rise-and-fall, distinct from the paused intervention breath.
  // Negative peak so it contracts (breathes in) rather than swelling out.
  breathPattern: SURF_WAVE_PATTERN,
  breathLoop: true,
  breathPeakBonus: -0.13,
});

/**
 * Intent/time choices: the question + options ride at the top of the screen and
 * the sun settles into the open space beneath them (see the `.has-resting-sun`
 * layout). A smaller, calmer disc that reads as a steady companion below the
 * choices rather than a banner above them.
 *
 * This static target is only the fallback used until the choices block is
 * measured; the live flow replaces it with `sunRestingSettle` anchored just
 * beneath the measured options (see `restingSunAnchorFromRect`), so the disc
 * tucks under both the 4-option intent screen and the taller 6-option time
 * screen and glides down when the extra options appear.
 */
export const SUN_REST_SETTLE: SunSettle = {
  anchorYRatio: 0.74, // sits below the question + options
  scale: 0.5,
  breathe: false,
};

/**
 * Resting choices, measured variant: rest at the point measured just beneath the
 * live choices block so the disc tucks under whatever options are showing. Keeps
 * SUN_REST_SETTLE's scale so the morph size is identical to the static fallback.
 */
export const sunRestingSettle = (anchor: {
  x: number;
  y: number;
}): SunSettle => ({
  anchorXPx: anchor.x,
  anchorYPxFromTop: anchor.y,
  scale: SUN_REST_SETTLE.scale,
  breathe: false,
});

/**
 * Disc centre for the resting sun: the centre of the reserved spacer that sits
 * beneath the options inside the centred choices group (see the
 * `.resting-sun-spacer` element / measureRestingSunAnchor). Because the spacer
 * lives in the flow, the disc lands inside the centred group and tracks it across
 * intent↔time and viewport changes without any clamping. Pure so the real flow
 * and the styleguide harness compute the same point and can't drift.
 */
export const restingSunAnchorFromRect = (spacerRect: {
  left: number;
  width: number;
  top: number;
  height: number;
}): { x: number; y: number } => ({
  x: spacerRect.left + spacerRect.width / 2,
  y: spacerRect.top + spacerRect.height / 2,
});

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
 * The Little Sun's white-disc diameter in CSS px, per platform - the departing
 * sun shrinks to *exactly* this so there's no size jump when the persistent timer
 * blooms in (a constant scale landed ~27px regardless, missing both targets):
 * - Web extension: the 40px SolidJS Little Sun (LittleSun.scss `$sun-size: 40px`).
 * - Android: the native 30dp disc (LittleSun.kt SunDisc `discSize = 30.dp`). dp ==
 *   CSS px in the full-screen interaction WebView, so 30dp reads as 30px here.
 * Keep in sync if either Little Sun's disc resizes.
 */
export const LITTLE_SUN_DISC_PX_WEB = 40;
export const LITTLE_SUN_DISC_PX_ANDROID = 30;

/**
 * Both Little Suns wear a warm amber breath halo (web: `rgba(233,132,58,…)` in
 * LittleSun.scss; Android: `#E99A3A` ≈ 233,154,58 in LittleSun.kt). The departing
 * sun warms its normally-white glow to this amber as it settles, so the halo
 * *colour* matches at hand-off too - not just the position and size. One shared
 * value: the two ambers differ by an imperceptible amount in a soft glow.
 */
export const LITTLE_SUN_GLOW_RGB = "233, 140, 58";

/**
 * Departing halo intensity, dialled down from the bold companion rest glow
 * (Sun.tsx COMPANION_REST_GLOW ≈ 1.8). The Little Sun's amber halo is a snug ring
 * roughly the disc's own width, not the broad bloom the resting companion wears,
 * so the morph tightens the glow to read as that same close halo when it hands
 * off. Tuned by eye in the styleguide SunMorphHarness; nudge here if it reads too
 * faint or too broad.
 */
export const DEPART_GLOW_INTENSITY = 1.0;

/**
 * Time chosen → the sun glides to the bottom-left corner, shrinks to the Little
 * Sun's exact disc size, and warms its halo to amber, then the Little Sun appears
 * in place where it lands, so the persistent timer reads as the very same sun
 * settling in.
 *
 * Anchored in fixed px (not viewport ratios) to match the Little Sun's fixed
 * corner exactly - otherwise the two drift apart on wide monitors (a 5vw anchor
 * is 64px at 1280px but 128px at 2560px, while the Little Sun stays put). The disc
 * is pinned in px (discPx) for the same reason: a constant scale tracks the base
 * disc, which varies with viewport, so it can't match a fixed-px Little Sun.
 */
export const sunDepartSettle = (
  cornerPx: number = LITTLE_SUN_CORNER_PX_WEB,
  discPx: number = LITTLE_SUN_DISC_PX_WEB,
): SunSettle => ({
  anchorXPx: cornerPx,
  anchorYPxFromBottom: cornerPx,
  discPx,
  glowColor: LITTLE_SUN_GLOW_RGB,
  glowIntensity: DEPART_GLOW_INTENSITY,
  breathe: false,
});

/** Default departing target (the web extension's SolidJS Little Sun corner). */
export const SUN_DEPART_SETTLE: SunSettle = sunDepartSettle();

/**
 * Departing target at a measured fractional point of the viewport, used on
 * Android where the native Little Sun is a free-floating, draggable bubble that
 * rests wherever the user parked it (persisted) rather than at the fixed corner.
 *
 * `frac` is the bubble's centre expressed as a fraction (0..1) of the device
 * display, read from the native side (see InteractionWindowJavaScriptInterface
 * .getLittleSunRestCenter). Because the interaction WebView covers the full
 * display, that fraction maps 1:1 onto its viewport - so the departing sun
 * glides to exactly where the native bubble will bloom in, on a wide phone or a
 * tall one, wherever it was dragged. Disc size + amber glow match
 * `sunDepartSettle` so the whole hand-off (position, size, halo) is seamless;
 * only the target point differs. Used on Android, so it defaults to the native
 * Little Sun's disc size.
 */
export const sunDepartSettleAt = (
  frac: {
    x: number;
    y: number;
  },
  discPx: number = LITTLE_SUN_DISC_PX_ANDROID,
): SunSettle => ({
  anchorXRatio: frac.x,
  anchorYRatio: frac.y,
  discPx,
  glowColor: LITTLE_SUN_GLOW_RGB,
  glowIntensity: DEPART_GLOW_INTENSITY,
  breathe: false,
});

/**
 * Companion rest: the idle home in the app shell, centred over the bottom bar.
 * Anchored in fixed px from the bottom (the measured `--companion-bar-center-y`)
 * so it lands on the bottom-bar anchor. No JS breath - the CSS idle-breath glow
 * on `.minded-sun` resumes on its own once the sun settles.
 */
/** Placeholder bottom-bar anchor used until MainWrapper measures the real px. */
export const DEFAULT_COMPANION_BOTTOM_Y_PX = 44;

/**
 * Daily-questions success bloom: the same companion disc that carried the user
 * through the questions glides up off the bottom bar to a calm upper-middle rest
 * and grows into the closing "have a wonderful day" sun. The success sun is
 * literally the sun that was already there - no separate element pops in, so
 * there's nothing to jump. Tune the bloom (height / size) here.
 */
export const sunDailyQuestionsSuccessSettle = (): SunSettle => ({
  // Sits in the upper third. The closing line is flow-centred (~mid-screen) while
  // this disc is anchored to the viewport, so keep the disc clearly above centre:
  // raising it widens the gap at every viewport height (and as the line wraps),
  // rather than relying on the two coordinate systems lining up by coincidence.
  anchorYRatio: 0.33,
  scale: 0.62, // larger than the companion (0.52) - a warm bloom, not full size
  breathe: false,
});

export const sunCompanionSettle = (
  barCenterYPxFromBottom: number,
): SunSettle => ({
  anchorYPxFromBottom: barCenterYPxFromBottom,
  // ~0.52 of the interaction sun's base gives the companion a touch more presence
  // on the bottom-bar band while still sitting comfortably below the 0.66 that
  // would nearly fill the band and crowd the icons either side.
  scale: 0.52,
  breathe: false,
});

/**
 * Map a sun phase to its settle target. `interactive` returns null (the sun is
 * draggable, not settled). Pure so it can be unit-tested and reused verbatim by
 * the styleguide harness. `companionBottomYPx` is the measured bottom-bar anchor,
 * needed only for the "companion" phase. `departCornerPx` / `departDiscPx` are
 * the Little Sun's corner inset and disc size, needed only for the "departing"
 * phase (default to the web extension's; Android passes its native Little Sun's
 * smaller corner and disc).
 */
export const getSunSettleForPhase = (
  phase: SunPhase,
  companionBottomYPx = DEFAULT_COMPANION_BOTTOM_Y_PX,
  departCornerPx: number = LITTLE_SUN_CORNER_PX_WEB,
  departDiscPx: number = LITTLE_SUN_DISC_PX_WEB,
): SunSettle | null => {
  switch (phase) {
    case "companion":
      return sunCompanionSettle(companionBottomYPx);
    case "breathing":
      return sunBreatheSettle();
    case "surfing":
      return sunSurfSettle();
    case "resting":
      return SUN_REST_SETTLE;
    case "departing":
      return sunDepartSettle(departCornerPx, departDiscPx);
    case "dailyQuestionsSuccess":
      return sunDailyQuestionsSuccessSettle();
    // "dailyQuestions" (the answering phase) rests on the bottom-bar companion
    // anchor, so getSunSettleForCurrentRole routes it through the companion
    // settle (which needs the measured px) rather than this pure map.
    default:
      return null;
  }
};

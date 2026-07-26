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

/**
 * THE HALO RULE - when the sun's glow is amber, and when it isn't.
 *
 * **The sun's body may be warm; the light it casts is white.** Amber is *not* a
 * day/night signal and *not* a role badge. On every surface we control the sun
 * always glows white - companion rest, interaction, breath, urge-surfing, the
 * intent/time choices, the daily-questions carry and its closing bloom. The
 * warm read comes from the disc itself (the `--minded-sun-face-edge` rim the
 * resting companion warms to `#fff5dc`, and the thin `--sun-shadow` edge ring),
 * never from an orange halo around it.
 *
 * The test is *what the sun stands on*, not which process draws it. Amber is for
 * the sun on a background we DON'T control, where it has to announce itself as a
 * sun or read as a pale blob:
 *   - the Little Sun overlay, over arbitrary app content;
 *   - the small home-screen widget, transparent on the user's wallpaper.
 * A widget that paints the app's OWN sky behind the sun (the prompt card, both
 * platforms) is our surface like any other, so the sun there glows white - see
 * `ic_sun_widget_day_on_sky.xml` and `CompanionSun.onOwnSky`.
 *
 * The departing hand-off is the one in-app state that warms, because it is
 * mid-morph into the Little Sun. The warming is the hand-off, not a state the
 * in-app sun ever holds.
 *
 * Note that this makes the two hand-offs deliberately ASYMMETRIC, and the test
 * above is why: the halo answers to the surface the sun is moving onto, not to
 * the animation it happens to be running. Departing, that surface is someone
 * else's app, so the sun warms on the way out. Arriving, it is our own sky, so
 * the sun is white the whole way home (`sunArriveSettle`) - the mirror morph is
 * pure size and position. Warming on arrival too would only mean an orange
 * flash at the top of every intervention re-shown after a session timer.
 *
 * Why: colour that changes with role turns the one continuous sun into a set of
 * differently-coloured suns, and it makes the everyday companion↔intervention
 * morph a colour change the user never asked for. Keeping the in-app halo white
 * means that morph is pure size and position - one object, one light. It also
 * keeps the halo's *only* remaining colour meaning intact: the cool half of the
 * axis, which an upward drag pulls the glow toward as the sun is let go.
 *
 * (The cool end is untouched by this rule - see `glowColorForTemp`. The moon
 * never warms at all.)
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

// Both Little Suns wear the app's one canonical amber halo (web:
// `--little-sun-shadow` in _variables.scss; Android: `GLOW_COLOR` in
// LittleSun.kt - both `#ffd673` ≈ 255,214,115). The departing sun warms its
// normally-white glow to that same amber via `warmth: 1` (the positive end of
// the shared glow axis maps to it - see glowColorForTemp), so the halo *colour*
// matches at hand-off too, not just the position and size. One amber everywhere.

/**
 * Departing halo intensity, dialled down from the resting floor every other
 * state sits at (Sun.tsx COMPANION_REST_GLOW = 1.25; 1.8 is the *hover* glow).
 * The Little Sun's amber halo is a snug ring roughly the disc's own width, not
 * the broad bloom the sun wears mid-interaction - which is where this morph
 * takes off from - so the hand-off both dims (this intensity) AND tightens the
 * *shape* (SNUG_GLOW_REACH on the glow axis, collapsing the far plume) to read
 * as that same close halo when it lands. The resting companion already rides
 * that same snug reach, for its own reason (see SNUG_GLOW_REACH). Tuned by eye
 * in the styleguide SunMorphHarness; nudge here if it reads too faint or broad.
 */
export const DEPART_GLOW_INTENSITY = 1.0;

/**
 * The snug halo spread on the glow axis (0 = snug, 1 = broad), shared by the two
 * states that must sit close to the disc rather than bloom: the resting day
 * companion (its far plume would be clipped low on the bar) and the departing
 * hand-off (its shape lands on the Little Sun widget's close ring, not the
 * interaction sun's broad bloom). One constant so the two "snug" states can't
 * silently drift apart. Only the outermost box-shadow layer is gated by reach
 * (Sun.scss), so this collapses the far plume while keeping the near 15/40px
 * halo - a snug two-layer presence, not a pinched single ring.
 */
export const SNUG_GLOW_REACH = 0.2;

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
  warmth: 1,
  reach: SNUG_GLOW_REACH,
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
  warmth: 1,
  reach: SNUG_GLOW_REACH,
  glowIntensity: DEPART_GLOW_INTENSITY,
  breathe: false,
});

/**
 * ARRIVING is not departing run backwards - the halo does not mirror.
 *
 * The corner point, the disc size and the snug reach are the same (the two
 * morphs must line up on the same spot, or they read as two different suns), so
 * these are the depart targets with the warmth taken back out.
 *
 * Why the asymmetry: the halo follows *what the sun stands on*, and the two
 * hand-offs are moving in opposite directions. Departing, the sun is on its way
 * onto arbitrary app content, where a white halo would read as a pale blob - so
 * it warms as it goes. Arriving, it is on its way onto our own sky, where the
 * whole rest of the flow glows white - so it never warms at all, and the morph
 * home is pure size and position, exactly like the companion→intervention lift.
 *
 * It used to reuse the departing target, so an intervention re-shown after a
 * session timer opened on an amber halo that faded to white over the glide -
 * an orange flash at the top of every post-session intervention (#262).
 */
export const sunArriveSettle = (
  cornerPx: number = LITTLE_SUN_CORNER_PX_WEB,
  discPx: number = LITTLE_SUN_DISC_PX_WEB,
): SunSettle => ({
  ...sunDepartSettle(cornerPx, discPx),
  warmth: 0,
});

/** Arriving from a measured point (Android's parkable bubble) - see above. */
export const sunArriveSettleAt = (
  frac: { x: number; y: number },
  discPx: number = LITTLE_SUN_DISC_PX_ANDROID,
): SunSettle => ({
  ...sunDepartSettleAt(frac, discPx),
  warmth: 0,
});

/**
 * Companion rest: the idle home in the app shell, centred over the bottom bar.
 * Anchored in fixed px from the bottom (the measured `--companion-bar-center-y`)
 * so it lands on the bottom-bar anchor. It stays still once settled; the quiet
 * presence and snug resting glow carry the companion state without a breath.
 */
/** Placeholder bottom-bar anchor used until MainWrapper measures the real px. */
export const DEFAULT_COMPANION_BOTTOM_Y_PX = 44;

/**
 * Daily-questions success bloom: the same companion disc that carried the user
 * through the questions glides up off the bottom bar and grows into the closing
 * "have a wonderful day" sun. The success sun is literally the sun that was
 * already there - no separate element pops in, so there's nothing to jump. Tune
 * the bloom (height / size) here.
 */
export const sunDailyQuestionsSuccessSettle = (): SunSettle => ({
  // Sits just below the vertical centre. The closing line is flow-centred
  // (~mid-screen) while this disc is anchored to the viewport, so keep the disc a
  // touch below centre - the sun rises from the bottom bar and settles *beneath*
  // the closing line rather than climbing over it, so the line stays clear at the
  // top of the group and the sun rests below it (close enough that the two still
  // read as one calm group). Above the text it competed with / overlapped the
  // line; below, the rising disc comes to rest without ever passing over it.
  anchorYRatio: 0.6,
  scale: 0.62, // larger than the companion (0.52) - a warm bloom, not full size
  breathe: false,
});

export const sunCompanionSettle = (
  barCenterYPxFromBottom: number,
): SunSettle => ({
  anchorYPxFromBottom: barCenterYPxFromBottom,
  isCompanion: true,
  // ~0.52 of the interaction sun's base gives the companion a touch more presence
  // on the bottom-bar band while still sitting comfortably below the 0.66 that
  // would nearly fill the band and crowd the icons either side.
  scale: 0.52,
  // No `warmth` - the resting companion glows white like every other in-app
  // state (see THE HALO RULE at the top of this file). It used to settle at
  // warmth 1, which made the everyday lift into an intervention a colour change
  // as well as a morph; white both ways keeps that morph pure size + position.
  // The companion still reads sunlit through its warm disc rim
  // (`--minded-sun-face-edge`, RouteCmp.module.scss) - the body is warm, the
  // light it casts is not.
  //
  // It does keep the shared *snug* halo (SNUG_GLOW_REACH), for a reason that has
  // nothing to do with colour: a low reach collapses the broad interaction
  // bloom's far plume, which this low on the bar would be clipped below and pull
  // the disc's visible mass upward off the icon line (#106). Reach rides the same
  // glow axis, so lifting into an intervention still eases it back broad rather
  // than swapping halos.
  reach: SNUG_GLOW_REACH,
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

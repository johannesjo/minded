/**
 * The resting/hover glow and lift of the sun and moon, and the two small pure
 * reads Sun.tsx makes from them. The reasoning for each value is kept here
 * with the value, since these are look decisions, not tuning knobs.
 */

// Hover lift + halo for the resting companion. The lift is slight; the glow
// reuses the drag box-shadow (see the inline --glow-intensity in Sun.tsx),
// pushed past its 0..1 drag range to a bold, unmistakable halo. The sun is
// the one hero object, so luminosity belongs here rather than on routine
// controls.
export const COMPANION_HOVER_SCALE = 1.06;
export const COMPANION_HOVER_GLOW = 1.8;

// The sun carries a halo at all times - the disc's box-shadow glow, white in
// app (THE HALO RULE in sunSettle.ts) - so the idle sun glows gently and,
// crucially, the glow never drops out while it's being dragged or tapped (both
// reset getGlowIntensity toward 0). We floor at this baseline rather than gate
// on drag: the drag ramp (0..1) is dimmer than the rest glow anyway, so letting
// it take over would only make the sun fade the moment you touch it.
//
// Held a notch below the hover glow (which still blooms to COMPANION_HOVER_GLOW
// on hover, so hover stays a visible lift). This is just the rest *brightness*;
// the companion's halo *shape* is tightened separately in CSS so it reads level
// with the bottom-bar icons. The disc sits low in the band, where the shared
// broad glow (Sun.scss: 15/40/80px) would be clipped by the screen edge below
// while pluming freely above - a one-sided, upward-only bloom that pulls the
// sun's visible mass up so it reads as sitting high, even though its body is
// centred on the icon line (worse the larger the disc). Lowering this intensity
// alone can't fix it (it scales the *whole* profile, so the 80px layer still
// plumes ~100px up); instead the resting daytime companion gets a snug 2-layer
// halo with no far plume - see `.isCompanion .minded-sun:not(.moon)` in
// RouteCmp.module.scss. With that tight shape the clip below removes almost
// nothing, so 1.25 keeps a soft, symmetric rest halo that stays level.
export const COMPANION_REST_GLOW = 1.25;

// The moon carries a resting glow too, the same way the sun does. Its face is
// pale and near-white, which washes out a faint halo, so it needs a genuinely
// bright bloom to read as glowing rather than as a flat disc with a ring. This
// floor was set when the face was a lunar photograph and kept when it became a
// drawn one: the drawn face is brighter, so if anything it wants less, but the
// value still reads as a gentle moon halo rather than the loud first pass - and
// dropping it is a look change to make deliberately, not a side effect of
// swapping the face. The white/cool bloom layers are Sun.scss's .moon
// box-shadow; hover lifts it further, echoing the bottom-bar hover. The face's
// own up-left light pool (Sun.scss) carries much of the "glowing orb" read, so
// the halo itself can stay restrained.
export const MOON_REST_GLOW = 1.1;
export const MOON_HOVER_GLOW = 1.7;

/**
 * Where on the single cool ↔ white ↔ amber glow axis the disc sits right now.
 * The drag's colour temperature owns the cool half (the up-drag/let-go read);
 * the warm half is only ever the settle's `warmth` (the departing hand-off).
 * The moon never warms: it reads the cool half only.
 */
export const sunGlowTemp = (
  variant: "sun" | "moon" | undefined,
  dragColorTemp: number,
  settleWarmth: number | undefined,
): number =>
  variant === "moon"
    ? Math.min(0, dragColorTemp)
    : dragColorTemp < 0
      ? dragColorTemp
      : (settleWarmth ?? 0);

/** The disc's lift while a finger holds it. */
export const PRESS_SCALE = 1.06;

/**
 * The transient scale layered on the disc for pointer feedback. `pressLift`
 * (0..1) is eased in on grab and out on release (Sun.tsx easePressLift) rather
 * than switched with the drag: the transform's CSS ease is off while a finger
 * or a JS glide drives the disc, so a plain flag would pop the disc ~5px
 * bigger on touch-down and back again on a snap-back or fling.
 */
export const interactionScaleFor = (state: {
  isCompletionStarted: boolean;
  pressLift: number;
  isHovered: boolean;
  isPointerOver: boolean;
}): number => {
  const settled = state.isCompletionStarted
    ? 1
    : state.isHovered
      ? COMPANION_HOVER_SCALE
      : state.isPointerOver
        ? 1.04
        : 1;
  const lift = Math.min(Math.max(state.pressLift, 0), 1);
  return settled + (PRESS_SCALE - settled) * lift;
};

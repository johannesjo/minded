/**
 * Timing and options for the "Stay a while?" grounding flow that the dashboard
 * sun offers when it is dragged *down* (toward the viewer). Up = let go, down =
 * ground yourself - the gesture direction picks the ritual.
 */

/** Minute options for the on-screen, timed meditation (eyes on a calm anchor). */
export const TIMER_MINUTE_OPTIONS = [1, 5, 10] as const;

/** Minute options for the screen-free sit (eyes off; the gong calls you back). */
export const QUIET_MINUTE_OPTIONS = [1, 2] as const;

/**
 * If the offer is ignored it fades on its own - a gentle offer never nags. Long
 * enough to read and consider, short enough not to linger.
 */
export const OFFER_AUTO_DISMISS_MS = 15000;

/** Fade in/out of the grounding overlay itself. */
export const GROUNDING_FADE_MS = 600;

/**
 * Crossfade between the grounding stage's own screens (offer ↔ duration ↔ the
 * sit ↔ settle) - a quick, soft swap, much shorter than the GROUNDING_FADE_MS the
 * whole overlay fades in/out with. Mirrors the urge-surf meditation's screen fade.
 */
export const SCREEN_FADE_MS = 200;

/**
 * How long the warm down-drag sky (sunset / night) takes to dissolve back to the
 * dashboard's standard sky once "Stay a while" opens. The dissolve starts the
 * moment the offer mounts - no hold on the sunset first - and eases slowly, a
 * calm, unhurried return that is deliberately much longer than the
 * GROUNDING_FADE_MS entrance/close fades.
 */
export const SKY_SETTLE_MS = 2500;

/**
 * How long the wordless settle beat holds after a finished timed sit before
 * closing - no praise, no verdict; the sun simply glides home to the bottom bar
 * and the sky settles. The morph carries the close (see #164).
 */
export const SETTLE_DURATION_MS = 2600;

/**
 * On Android the screen-free sit gets the screen out of the way entirely: a
 * "put your phone down" message and an opening gong show for this long, then
 * the phone locks. Locking immediately would swallow the gong and the message;
 * lingering any longer undercuts the point of stepping away.
 */
export const ANDROID_LOCK_DELAY_MS = 1600;

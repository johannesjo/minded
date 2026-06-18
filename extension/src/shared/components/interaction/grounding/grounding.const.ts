/**
 * Timing and options for the "Stay a while?" grounding flow that the dashboard
 * sun offers when it is dragged *down* (toward the viewer). Up = let go, down =
 * ground yourself — the gesture direction picks the ritual.
 */

/** Minute options for the on-screen, timed meditation (eyes on a calm anchor). */
export const TIMER_MINUTE_OPTIONS = [1, 5, 10] as const;

/** Minute options for the screen-free sit (eyes off; the gong calls you back). */
export const QUIET_MINUTE_OPTIONS = [1, 2] as const;

/**
 * If the offer is ignored it fades on its own — a gentle offer never nags. Long
 * enough to read and consider, short enough not to linger.
 */
export const OFFER_AUTO_DISMISS_MS = 15000;

/** Fade in/out of the grounding overlay itself. */
export const GROUNDING_FADE_MS = 600;

/** How long "Be proud!" lingers after a finished timed sit before closing. */
export const PRAISE_DURATION_MS = 2600;

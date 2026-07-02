/**
 * Timing for the BELL interaction — one strike, listened all the way down into
 * silence.
 */

/**
 * Cross-screen fade between the invite and the listen screen. Matches the
 * urge-surf meditation's screen fade (and the transition on `.bell-interaction`
 * in Bell.scss).
 */
export const BELL_SCREEN_FADE_MS = 240;

/**
 * Quiet held after the strike has fully decayed before the "It's gone"
 * confirmation fades in. The silence the bell leaves behind is part of the
 * practice; surfacing the button any earlier would invite a tap that races the
 * tail of the ring.
 */
export const BELL_SILENCE_BEFORE_CONFIRM_MS = 1600;

/** Soft arrival of the confirmation, easing in out of that silence. */
export const BELL_CONFIRM_FADE_MS = 900;

/**
 * How often the listen screen pokes the parent's auto-dismiss while the bell
 * rings: the whole point is to sit still, so no pointer input would otherwise
 * keep the overlay's fade from firing mid-listen (mirrors urge surfing's wave
 * tick). Stops once the confirmation is up.
 */
export const BELL_KEEP_ALIVE_TICK_MS = 200;

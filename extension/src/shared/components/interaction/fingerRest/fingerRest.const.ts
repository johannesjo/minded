/**
 * Timing for the FINGER_REST interaction — stillness itself as the practice.
 */

/**
 * A touch shorter than this was a tap, not a rest: nothing happens and the
 * invitation simply returns. Deliberately NOT a hold-to-unlock gate — there is
 * no announced target, no progress shown, and lifting is always free; this
 * threshold only tells an accidental brush apart from an actual moment of
 * rest.
 */
export const FINGER_REST_MIN_MS = 1200;

/**
 * The invitation dissolves as stillness begins (words have no place in it) and
 * eases back if the finger leaves early.
 */
export const FINGER_REST_CUE_FADE_MS = 900;

/**
 * The warmth under the resting finger arrives slowly — a quiet response, not a
 * reward animation — and releases a little quicker than it gathered.
 */
export const FINGER_REST_WARMTH_IN_MS = 3000;
export const FINGER_REST_WARMTH_OUT_MS = 1200;

/**
 * How often the resting screen pokes the parent's auto-dismiss countdown while
 * the finger rests: stillness produces no pointer events, so nothing else
 * would reset it (mirrors the bell's ring and urge surfing's wave).
 */
export const FINGER_REST_KEEP_ALIVE_TICK_MS = 200;

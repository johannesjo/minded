/**
 * The intervention sun's two outcomes, in the words it teaches them. Shared by
 * the real intervention and the web onboarding's rehearsal so the two can never
 * drift apart.
 */

/** Taps on the intervention sun that continue into the time choice. */
export const SUN_TAP_THRESHOLD = 3;

/** The continue hint follows the let-go hint after this beat. */
export const SUN_HINT_STAGGER_MS = 1200;

/** `objectName` is the disc's day/night word: "sun" or "moon". */
export const letGoHint = (objectName: string): string =>
  `Drag the ${objectName} down or fling it away to let go.`;

/** `objectName` is the disc's day/night word: "sun" or "moon". */
export const continueHint = (objectName: string): string =>
  `Tap the ${objectName} ${SUN_TAP_THRESHOLD} times to continue.`;

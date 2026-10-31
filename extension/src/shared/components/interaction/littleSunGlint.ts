/**
 * The Little Sun's glint: after the sun has kept the user company for a while,
 * its light brightens for a moment and eases away again - a soft, wordless
 * reminder that a pause is there, never a prompt. One brightening per due
 * moment, never a repeating swell (that would be an unguided breath, which the
 * companion sun doesn't do).
 *
 * Mirrors the Android Little Sun (LittleSunGlint.kt) - keep the two in step.
 */
export const LITTLE_SUN_GLINT_EVERY_S = 10 * 60;

/**
 * No glint this close before the sun hands back to the full pause anyway: the
 * pause itself is the reminder, and two nudges in a row would be one too many.
 */
export const LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S = 3 * 60;

/** How long one glint plays - keep in step with the keyframes in LittleSun.scss. */
export const LITTLE_SUN_GLINT_MS = 3700;

/**
 * Whether the sun glints on this tick. `secondsWithSun` counts the seconds the
 * sun has been in view since it appeared; `secondsUntilPause` is how long until
 * it hands back to the pause, or null when nothing is scheduled.
 */
export const isLittleSunGlintDue = (
  secondsWithSun: number,
  secondsUntilPause: number | null,
): boolean =>
  secondsWithSun > 0 &&
  secondsWithSun % LITTLE_SUN_GLINT_EVERY_S === 0 &&
  (secondsUntilPause === null ||
    secondsUntilPause > LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S);

export const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
export const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;

/**
 * Seconds from `sessionS` until the counting-up Little Sun next re-shows the
 * intervention: the first whole re-question interval more than the minimum
 * past where this sun started counting (`initialS`).
 */
export const getSecondsUntilReQuestion = (
  sessionS: number,
  initialS: number,
): number => {
  const earliest = Math.max(
    sessionS + 1,
    initialS + MIN_RE_QUESTION_ELAPSED_TIME_S + 1,
  );
  const next =
    Math.ceil(earliest / RE_QUESTION_INTERVAL_IN_S) * RE_QUESTION_INTERVAL_IN_S;
  return next - sessionS;
};

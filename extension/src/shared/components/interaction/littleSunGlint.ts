/**
 * The Little Sun's glint: after the sun has kept the user company for a while,
 * its light brightens for a moment and eases away again - a soft, wordless
 * reminder that a pause is there, never a prompt. One brightening per due
 * moment, never a repeating swell (that would be an unguided breath, which the
 * companion sun doesn't do).
 *
 * How often is the user's choice (cfg.littleSunGlintMinutes).
 *
 * Mirrors the Android Little Sun (LittleSunGlint.kt) - keep the two in step.
 */
export const LITTLE_SUN_GLINT_DEFAULT_MINUTES = 5;

/** The intervals the settings offer; 0 (off) aside, anything else reads as the default. */
export const LITTLE_SUN_GLINT_MINUTES_OPTIONS = [1, 5, 10, 15, 30] as const;

/**
 * Seconds between glints for the user's setting (cfg.littleSunGlintMinutes),
 * or null when they're off.
 */
export const getLittleSunGlintEveryS = (
  minutes: number | undefined,
): number | null => {
  if (minutes === 0) return null;
  const m = (LITTLE_SUN_GLINT_MINUTES_OPTIONS as readonly number[]).includes(
    minutes ?? -1,
  )
    ? minutes!
    : LITTLE_SUN_GLINT_DEFAULT_MINUTES;
  return m * 60;
};

/**
 * No glint this close before the sun hands back to the full pause anyway: the
 * pause itself is the reminder, and two nudges in a row would be one too many.
 */
export const LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S = 3 * 60;

/** How long one glint plays - keep in step with the keyframes in LittleSun.scss. */
export const LITTLE_SUN_GLINT_MS = 3700;

/**
 * Whether the sun glints on this tick. `secondsWithSun` counts the seconds the
 * sun has been in view since it appeared; `everyS` is the interval (null: off);
 * `secondsUntilPause` is how long until it hands back to the pause, or null
 * when nothing is scheduled.
 */
export const isLittleSunGlintDue = (
  secondsWithSun: number,
  everyS: number | null,
  secondsUntilPause: number | null,
): boolean =>
  everyS !== null &&
  secondsWithSun > 0 &&
  secondsWithSun % everyS === 0 &&
  (secondsUntilPause === null ||
    secondsUntilPause > LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S);

/**
 * On the web, a counting-up Little Sun re-shows the full pause every 15
 * minutes (the re-question below), and each pause starts a fresh sun - and a
 * fresh glint clock. So there, an interval of 15 or 30 minutes rarely or never
 * glints in an open-ended stay: the re-question already is the (stronger)
 * reminder. Timed sessions, grace, and Android have no re-question, so every
 * interval applies there.
 */
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

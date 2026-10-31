package com.minded.minded.util

/**
 * The Little Sun's glint: after the sun has kept the user company for a while,
 * its light brightens for a moment and eases away again - a soft, wordless
 * reminder that a pause is there, never a prompt. One brightening per due
 * moment, never a repeating swell (that would be an unguided breath, which
 * the companion sun doesn't do).
 *
 * How often is the user's choice (cfg.littleSunGlintMinutes, set in the
 * WebView settings); absent means the default, 0 means off.
 *
 * Mirrors the web Little Sun (littleSunGlint.ts) - keep the two in step.
 */
const val LITTLE_SUN_GLINT_DEFAULT_MINUTES = 5

/** The intervals the settings offer, plus 0 for off; anything else reads as the default. */
val LITTLE_SUN_GLINT_MINUTES_ALLOWED = setOf(0, 1, 5, 10, 15, 30)

/**
 * No glint this close before the sun hands back to the full pause anyway: the
 * pause itself is the reminder, and two nudges in a row would be one too many.
 */
const val LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S = 3 * 60

/** Seconds between glints for the user's setting, or null when they're off. */
fun littleSunGlintEveryS(minutes: Int?): Int? {
    val m = minutes?.takeIf { it in LITTLE_SUN_GLINT_MINUTES_ALLOWED }
        ?: LITTLE_SUN_GLINT_DEFAULT_MINUTES
    return if (m > 0) m * 60 else null
}

/**
 * Whether the sun glints on this tick. [secondsWithSun] counts the seconds the
 * sun has been in view (screen on, unlocked) since it appeared; [everyS] is
 * the interval (null: off); [secondsUntilPause] is how long until it hands
 * back to the pause, or null when nothing is scheduled.
 */
fun isLittleSunGlintDue(secondsWithSun: Int, everyS: Int?, secondsUntilPause: Int?): Boolean =
    everyS != null &&
        secondsWithSun > 0 &&
        secondsWithSun % everyS == 0 &&
        (secondsUntilPause == null || secondsUntilPause > LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S)

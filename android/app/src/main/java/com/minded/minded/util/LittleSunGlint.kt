package com.minded.minded.util

/**
 * The Little Sun's glint: after the sun has kept the user company for a while,
 * its light brightens for a moment and eases away again - a soft, wordless
 * reminder that a pause is there, never a prompt. One brightening per due
 * moment, never a repeating swell (that would be an unguided breath, which
 * the companion sun doesn't do).
 *
 * Mirrors the web Little Sun (littleSunGlint.ts) - keep the two in step.
 */
const val LITTLE_SUN_GLINT_EVERY_S = 10 * 60

/**
 * No glint this close before the sun hands back to the full pause anyway: the
 * pause itself is the reminder, and two nudges in a row would be one too many.
 */
const val LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S = 3 * 60

/**
 * Whether the sun glints on this tick. [secondsWithSun] counts the seconds the
 * sun has been in view (screen on, unlocked) since it appeared;
 * [secondsUntilPause] is how long until it hands back to the pause, or null
 * when nothing is scheduled.
 */
fun isLittleSunGlintDue(secondsWithSun: Int, secondsUntilPause: Int?): Boolean =
    secondsWithSun > 0 &&
        secondsWithSun % LITTLE_SUN_GLINT_EVERY_S == 0 &&
        (secondsUntilPause == null || secondsUntilPause > LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S)

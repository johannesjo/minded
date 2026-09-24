package com.minded.minded.util

/**
 * Native side of the skip check-in (extension/src/shared/components/interaction/
 * skipCheckIn/skipCheckIn.ts). The WebView decides *what* the check-in asks; the
 * native layer only needs to honour the answer (the chosen week) and to keep its
 * own shortcut past an intervention - the tap on the loading sun - from
 * sidestepping the question. The constants are mirrored from the TS module and
 * guarded by interventionPauseMirror.test.ts.
 */

/** Passes in a row before the check-in asks. Mirrors SKIP_CHECK_IN_THRESHOLD. */
const val SKIP_CHECK_IN_THRESHOLD = 10

/** Session seconds before the "later" pause arrives. Mirrors LATER_PAUSE_AFTER_S. */
const val LATER_PAUSE_AFTER_S = 600

/**
 * Longest gap between two passes that still counts as "lately" (3 days).
 * Mirrors SKIP_STREAK_MAX_GAP_MS.
 */
const val SKIP_STREAK_MAX_GAP_MS = 259200000L

const val INTERVENTION_PAUSE_KIND_LATER = "later"
const val INTERVENTION_PAUSE_KIND_OFF = "off"

/**
 * The kind of the standing check-in answer, else null. "as_now" stands too (it
 * keeps the check-in from asking again that week) but changes no routing.
 */
fun activeInterventionPauseKind(pause: InterventionPause?, nowMs: Long): String? =
    pause?.takeIf { it.untilTS > nowMs }?.kind

private fun isRecentSkip(lastSkipTS: Long, nowMs: Long): Boolean =
    lastSkipTS > 0L && nowMs - lastSkipTS <= SKIP_STREAK_MAX_GAP_MS

fun isSkipCheckInDue(
    skipStreak: Int,
    lastSkipTS: Long,
    pause: InterventionPause?,
    nowMs: Long,
): Boolean =
    skipStreak >= SKIP_CHECK_IN_THRESHOLD &&
        isRecentSkip(lastSkipTS, nowMs) &&
        activeInterventionPauseKind(pause, nowMs) == null

/**
 * Session seconds at which a "later" week hands the Little Sun back to the full
 * pause. A longer grace the user set themselves still wins, matching the web,
 * where the "later" week simply widens the grace (sessionGrace.ts).
 */
fun laterPauseAtSessionS(sessionGraceEnabled: Boolean, sessionGraceMinutes: Int): Int =
    maxOf(LATER_PAUSE_AFTER_S, if (sessionGraceEnabled) sessionGraceMinutes * 60 else 0)

/**
 * The streak after one more pass, or null when it doesn't count, like
 * getSkipUpdateAfterSkip on the TS side: frozen while an answer stands, and
 * never at bedtime (the check-in never asks there, so it must not be about
 * bedtime taps either). After a long gap it starts over at one.
 */
fun skipStreakAfterSkip(
    skipStreak: Int,
    lastSkipTS: Long,
    pause: InterventionPause?,
    nowMs: Long,
    isBedtime: Boolean = false,
): Int? = when {
    isBedtime -> null
    activeInterventionPauseKind(pause, nowMs) != null -> null
    isRecentSkip(lastSkipTS, nowMs) -> skipStreak + 1
    else -> 1
}

/**
 * A "later" week only counts time the user can actually be in the app - the
 * screen on AND unlocked. The screen is also "interactive" on the lock screen,
 * so interactive alone would let a pause fire behind the keyguard and meet the
 * user on unlock.
 */
fun unlockedSessionAfterTick(unlockedSessionS: Int, isUnlocked: Boolean): Int =
    if (isUnlocked) unlockedSessionS + 1 else unlockedSessionS

/** Whether a Little Sun holding a "later" week back should hand over now. */
fun shouldHandBackToPause(
    pauseAtSessionS: Int?,
    unlockedSessionS: Int,
    isUnlocked: Boolean,
): Boolean = pauseAtSessionS != null && isUnlocked && unlockedSessionS >= pauseAtSessionS

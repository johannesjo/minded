package com.minded.minded.widget

import com.minded.minded.sleepwinddown.SleepWindDownWindow
import com.minded.minded.util.SyncData
import com.minded.minded.util.getBudgetRemainingSeconds

/**
 * The sun-as-companion concept (Android home-screen widget prototype).
 *
 * Instead of only appearing reactively when you're caught in a blocked app, the
 * little sun lives permanently on the home screen and its appearance reflects
 * how the day is going. This file is the pure, testable heart of that idea:
 * given the current [SyncData] and time, it decides what the sun should look
 * like. Rendering (Glance widget) and styling live separately so this can be
 * unit-tested without an Android device.
 */
enum class SunMood {
    /** Within intentions — full, warm sun. */
    RADIANT,

    /** Budget is burning down (drifting) — the glow cools. */
    DIMMING,

    /** Almost out of budget — faded, a gentle nudge. */
    LOW,

    /** Budget spent for today — the sun has set. */
    SPENT,

    /** Inside the wind-down window (or snoozing it) — the sun becomes the moon. */
    NIGHT,
}

data class SunCompanionState(
    val mood: SunMood,
    /** Fraction of today's budget still available (0f..1f), or null when no budget is configured. */
    val budgetFraction: Float?,
    /** Seconds of budget left today, or null when no budget is configured. */
    val remainingSeconds: Int?,
    /** Short face label for the widget, e.g. "32m". Empty when there is nothing to count down. */
    val label: String,
)

/** Below this fraction of remaining budget the sun reads as [SunMood.LOW]. */
private const val LOW_THRESHOLD = 0.15f

/** Below this fraction of remaining budget the sun reads as [SunMood.DIMMING]. */
private const val DIMMING_THRESHOLD = 0.5f

fun computeSunCompanionState(
    syncData: SyncData,
    nowMs: Long = System.currentTimeMillis(),
): SunCompanionState {
    // Night takes precedence over budget: inside a configured wind-down window,
    // or actively snoozing it, the companion is a calm moon.
    val isWindDown = SleepWindDownWindow.resolveNightId(syncData.cfg, nowMs) != null
    val isSnoozing = syncData.sleepWindDownSnoozeUntilTS > nowMs
    if (isWindDown || isSnoozing) {
        return SunCompanionState(SunMood.NIGHT, budgetFraction = null, remainingSeconds = null, label = "")
    }

    val budget = syncData.dailyBudget
    if (budget == null || budget.globalMinutes <= 0) {
        // No budget set: a calm, ever-present sun with nothing to count down.
        return SunCompanionState(SunMood.RADIANT, budgetFraction = null, remainingSeconds = null, label = "")
    }

    val totalSeconds = budget.globalMinutes * 60
    val remaining = getBudgetRemainingSeconds(syncData)
    val fraction = (remaining.toFloat() / totalSeconds).coerceIn(0f, 1f)

    val mood = when {
        remaining <= 0 -> SunMood.SPENT
        fraction <= LOW_THRESHOLD -> SunMood.LOW
        fraction <= DIMMING_THRESHOLD -> SunMood.DIMMING
        else -> SunMood.RADIANT
    }

    return SunCompanionState(mood, fraction, remaining, formatRemainingLabel(remaining))
}

private fun formatRemainingLabel(seconds: Int): String {
    if (seconds <= 0) return "0m"
    val minutes = seconds / 60
    return when {
        minutes >= 60 -> {
            val h = minutes / 60
            val m = minutes % 60
            if (m == 0) "${h}h" else "${h}h${m}m"
        }
        minutes >= 1 -> "${minutes}m"
        else -> "<1m"
    }
}

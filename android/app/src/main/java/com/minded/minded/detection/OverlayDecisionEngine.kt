package com.minded.minded.detection

import java.time.Instant

/**
 * Pure business logic for overlay display decisions.
 *
 * Extracted from OverlayControllerService for testability.
 * Contains no Android dependencies.
 */
class OverlayDecisionEngine {

    companion object {
        /** Time threshold to reset session duration (in seconds) */
        const val RESET_APP_USAGE_DURATION_THRESHOLD_IN_S = 20

        /** Debounce time after hiding all overlays (in milliseconds) */
        const val HIDE_TO_SHOW_DEBOUNCE_MS = 500L

        /** Debounce time after app switch (in milliseconds) */
        const val APP_SWITCH_DEBOUNCE_MS = 300L
    }

    /**
     * Determines what overlay action to take for a given app.
     *
     * @param currentPackage The package name of the current foreground app
     * @param state Current state of the overlay system
     * @return The decision on what overlay action to take
     */
    fun decide(
        currentPackage: String,
        state: OverlayState
    ): OverlayDecision {
        // Skip our own package
        if (currentPackage == state.ownPackage) {
            return OverlayDecision.Skip(SkipReason.OWN_PACKAGE)
        }

        // Debounce: skip if we recently hid all overlays
        val timeSinceHideAll = state.currentTime - state.lastHideAllTimestamp
        if (timeSinceHideAll < state.hideToShowDebounceMs) {
            return OverlayDecision.Skip(SkipReason.RECENT_HIDE_ALL)
        }

        // Not a blocked app - hide overlays
        if (!state.blockedApps.contains(currentPackage)) {
            return OverlayDecision.HideAll
        }

        // Launcher package - hide overlays
        if (isLauncherPackage(currentPackage)) {
            return OverlayDecision.HideAll
        }

        if (state.isWindDownActive) {
            return if (state.isSleepWindDownOverlayShowing) {
                OverlayDecision.Skip(SkipReason.OVERLAY_ALREADY_SHOWING)
            } else {
                OverlayDecision.ShowSleepWindDown
            }
        }

        if (state.isWindDownSnoozed) {
            return OverlayDecision.ShowWindDownSnoozeTimer
        }

        // Skip if user just switched to the app (debounce)
        if (state.lastGoToAppTimestamp > 0 &&
            state.currentTime - state.lastGoToAppTimestamp < state.appSwitchDebounceMs
        ) {
            return OverlayDecision.Skip(SkipReason.RECENT_APP_SWITCH)
        }

        val isRestOfDayActive = state.activeTimerDurationS == -1 &&
            state.activeTimerEndTime?.let { it > state.currentTime } == true

        if (isRestOfDayActive) {
            return OverlayDecision.HideAll
        }

        // Check if any overlay is already showing
        if (state.isAnyOverlayShowing) {
            return OverlayDecision.Skip(SkipReason.OVERLAY_ALREADY_SHOWING)
        }

        // Check if there's an active session (within time limit)
        val sessionEndTime = state.appSessionEndTime ?: state.activeTimerEndTime
        val isWithinSessionLimit = sessionEndTime?.let { it > state.currentTime } ?: false

        return if (isWithinSessionLimit) {
            // Active session exists - show little sun
            OverlayDecision.ShowLittleSun
        } else if (isWithinSessionGrace(state)) {
            // Per-session grace period still has time - show little sun
            OverlayDecision.ShowLittleSun
        } else if (state.hasBudgetRemaining) {
            // Daily budget has remaining time - show little sun
            OverlayDecision.ShowLittleSun
        } else {
            // No active session, no grace, no budget remaining - show intervention
            OverlayDecision.ShowIntervention
        }
    }

    private fun isWithinSessionGrace(state: OverlayState): Boolean {
        if (!state.sessionGraceEnabled) return false
        if (state.sessionGraceMinutes <= 0) return false
        return state.currentSessionDurationS < state.sessionGraceMinutes * 60
    }

    /**
     * Determines if the session duration should be reset.
     *
     * @param lastUsedTime When the app was last used
     * @param currentTime Current timestamp
     * @return true if session duration should be reset to 0
     */
    fun shouldResetSessionDuration(lastUsedTime: Instant?, currentTime: Instant): Boolean {
        if (lastUsedTime == null) return false
        return lastUsedTime.isBefore(
            currentTime.minusSeconds(RESET_APP_USAGE_DURATION_THRESHOLD_IN_S.toLong())
        )
    }

    private fun isLauncherPackage(packageName: String): Boolean {
        return packageName.contains("launcher") || packageName.contains("home")
    }
}

/**
 * Current state of the overlay system.
 */
data class OverlayState(
    /** Our own package name */
    val ownPackage: String = "com.minded.minded",

    /** Set of blocked app package names */
    val blockedApps: Set<String>,

    /** Current timestamp in milliseconds */
    val currentTime: Long,

    /** Timestamp when hideAll was last called */
    val lastHideAllTimestamp: Long = 0L,

    /** Debounce after hiding all overlays */
    val hideToShowDebounceMs: Long = OverlayDecisionEngine.HIDE_TO_SHOW_DEBOUNCE_MS,

    /** Timestamp when user last switched to an app via "Go to App" */
    val lastGoToAppTimestamp: Long = 0L,

    /** Debounce after switching to the app through minded */
    val appSwitchDebounceMs: Long = OverlayDecisionEngine.APP_SWITCH_DEBOUNCE_MS,

    /** Whether any overlay is currently showing */
    val isAnyOverlayShowing: Boolean = false,

    /** Whether the sleep wind-down overlay is currently showing */
    val isSleepWindDownOverlayShowing: Boolean = false,

    /** Session end time for current app (if any) */
    val appSessionEndTime: Long? = null,

    /** Global active timer end time (if any) */
    val activeTimerEndTime: Long? = null,

    /** Global active timer duration in seconds, or -1 for rest-of-day */
    val activeTimerDurationS: Int? = null,

    /** Whether the daily budget has remaining time */
    val hasBudgetRemaining: Boolean = false,

    /** Whether the per-session grace period setting is enabled */
    val sessionGraceEnabled: Boolean = false,

    /** Grace minutes when enabled (matches SessionGraceCfg.minutes) */
    val sessionGraceMinutes: Int = 0,

    /** Foreground duration of the current app session, in seconds */
    val currentSessionDurationS: Int = 0,

    /** Whether sleep wind-down should currently take over blocked apps */
    val isWindDownActive: Boolean = false,

    /** Whether sleep wind-down is snoozed and should show a timer instead */
    val isWindDownSnoozed: Boolean = false
)

/**
 * Decision on what overlay action to take.
 */
sealed class OverlayDecision {
    /** Show the intervention overlay */
    object ShowIntervention : OverlayDecision()

    /** Show the little sun overlay */
    object ShowLittleSun : OverlayDecision()

    /** Show the sleep wind-down overlay */
    object ShowSleepWindDown : OverlayDecision()

    /** Show the little sun overlay for a wind-down snooze */
    object ShowWindDownSnoozeTimer : OverlayDecision()

    /** Hide all overlays */
    object HideAll : OverlayDecision()

    /** Skip - do nothing */
    data class Skip(val reason: SkipReason) : OverlayDecision()
}

/**
 * Reasons for skipping overlay action.
 */
enum class SkipReason {
    /** Current package is our own app */
    OWN_PACKAGE,

    /** Recently hid all overlays (debounce) */
    RECENT_HIDE_ALL,

    /** User recently switched to this app */
    RECENT_APP_SWITCH,

    /** An overlay is already showing */
    OVERLAY_ALREADY_SHOWING
}

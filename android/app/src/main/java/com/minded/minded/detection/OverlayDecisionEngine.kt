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

        /**
         * Max age of a detection's *emit* timestamp before we treat it as stale
         * and refuse to draw (guard 2a). Coarse on purpose: this only catches a
         * detection that sat too long in the delivery pipe. It cannot catch a
         * read that was already stale when emitted (the poll can read a 1-2s-old
         * foreground and emit it "fresh") - that is what the render-time
         * foreground re-check (guard 2b, STALE_FOREGROUND) handles.
         */
        const val STALE_SHOW_THRESHOLD_MS = 3000L

        /**
         * How recent the freshest foreground read must be for it to count as
         * positive evidence in the render-time re-check (guard 2b). Older reads
         * are ignored (treated as "no evidence") so we never false-block on
         * stale holder data.
         */
        const val FOREGROUND_FRESH_WINDOW_MS = 1500L
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

        // Liveness gate: from here on every branch can DRAW the sun for this
        // blocked app, so re-check that the draw is still wanted. Placed after
        // the HideAll branches so these guards only ever suppress a draw - never
        // a hide. (docs/sun-escalation-and-detection-reliability.md, Slice 1.)

        // Guard 2a: reject a detection that was delivered too late. The
        // timestamp is *emit* time, so a positive age means the event sat in the
        // delivery pipe. A zero timestamp means "no info" (non-detection
        // callers) - never skip on that. The strict `>` keeps clock skew
        // (negative age) from false-triggering.
        if (state.detectionTimestamp > 0L &&
            state.currentTime - state.detectionTimestamp > STALE_SHOW_THRESHOLD_MS
        ) {
            return OverlayDecision.Skip(SkipReason.STALE_DETECTION)
        }

        // Guard 2b: render-time foreground re-check. If we have *fresh* positive
        // evidence that some other app now holds the foreground, the user has
        // already left the target - skip the draw. Only acts on evidence that is
        // both present and recent; null or stale holder data is "no evidence"
        // and must NOT block (avoids false-blocking).
        // The evidence must also be at least as new as the detection it would
        // override (`>= detectionTimestamp`): a holder value OLDER than this
        // detection must never suppress it, else a stale holder (e.g. the
        // high-confidence path emits with a null focus read and leaves a prior
        // app in the holder) would wrongly skip a legitimate draw. Callers that
        // pass detectionTimestamp == 0L always satisfy this clause. Note the two
        // synchronous accessibility-event callers of triggerOverlay() stamp ~now
        // (not 0L), so this clause is almost always false for them and 2b is
        // effectively inert on those paths - acceptable, since the triggering
        // event is itself a fresh focused-window signal.
        // Authoritative only while accessibility is alive (its writer dies with
        // the accessibility service); in poll-only degraded mode this narrows
        // but does not eliminate the stale window.
        val freshForeground = state.freshestForegroundPackage
        if (freshForeground != null &&
            state.currentTime - state.freshestForegroundTimestamp in 0..FOREGROUND_FRESH_WINDOW_MS &&
            state.freshestForegroundTimestamp >= state.detectionTimestamp &&
            freshForeground != currentPackage
        ) {
            return OverlayDecision.Skip(SkipReason.STALE_FOREGROUND)
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
        } else {
            // No active session and no grace remaining - show intervention
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

    /** Whether the per-session grace period setting is enabled */
    val sessionGraceEnabled: Boolean = false,

    /** Grace minutes when enabled (matches SessionGraceCfg.minutes) */
    val sessionGraceMinutes: Int = 0,

    /** Foreground duration of the current app session, in seconds */
    val currentSessionDurationS: Int = 0,

    /** Whether sleep wind-down should currently take over blocked apps */
    val isWindDownActive: Boolean = false,

    /** Whether sleep wind-down is snoozed and should show a timer instead */
    val isWindDownSnoozed: Boolean = false,

    /**
     * Emit timestamp of the detection that triggered this check (guard 2a).
     * 0L means "no detection timestamp available" (non-detection callers) and
     * never causes a stale-detection skip.
     */
    val detectionTimestamp: Long = 0L,

    /**
     * Freshest known foreground package from the liveness holder (guard 2b), or
     * null when no read is available. Only acted upon when also recent (see
     * [freshestForegroundTimestamp]).
     */
    val freshestForegroundPackage: String? = null,

    /** When [freshestForegroundPackage] was read (System.currentTimeMillis()). */
    val freshestForegroundTimestamp: Long = 0L
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
    OVERLAY_ALREADY_SHOWING,

    /** Detection was delivered too late (emit timestamp too old) - guard 2a */
    STALE_DETECTION,

    /** Fresh evidence shows the foreground is no longer the target app - guard 2b */
    STALE_FOREGROUND
}

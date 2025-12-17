package com.minded.minded.detection

/**
 * Analyzes app transitions to determine the type of navigation pattern.
 *
 * This class is extracted from MyAccessibilityService for testability.
 * It contains pure logic for pattern detection without Android dependencies.
 */
class TransitionPatternAnalyzer(
    private val isSystemPackage: (String) -> Boolean,
    private val isLauncherPackage: (String) -> Boolean
) {
    companion object {
        // Transition detection timeouts
        const val LAUNCHER_TO_APP_TIMEOUT_MS = 2000L
        const val APP_SWITCH_VIA_LAUNCHER_TIMEOUT_MS = 3000L
        const val DIRECT_APP_SWITCH_TIMEOUT_MS = 1000L
        const val RETURNING_TO_APP_TIMEOUT_MS = 5000L
        const val NOTIFICATION_RETURN_TIMEOUT_MS = 2000L

        // Pattern confidence scores
        fun getPatternConfidence(pattern: TransitionPattern): Float {
            return when (pattern) {
                TransitionPattern.FIRST_APP_LAUNCH -> 0.95f
                TransitionPattern.LAUNCHER_TO_APP -> 0.95f
                TransitionPattern.APP_SWITCH_VIA_LAUNCHER -> 0.90f
                TransitionPattern.DIRECT_APP_SWITCH -> 0.85f
                TransitionPattern.RETURNING_TO_APP -> 0.20f
                TransitionPattern.NOTIFICATION_PULL -> 0.15f
                TransitionPattern.RECENTS_BROWSING -> 0.10f
                TransitionPattern.QUICK_SETTINGS_PULL -> 0.15f
                TransitionPattern.UNKNOWN -> 0.50f
            }
        }
    }

    /**
     * Analyzes the transition history to determine the current navigation pattern.
     *
     * @param transitionHistory List of recent transitions (newest last)
     * @param currentPackage The package being transitioned to
     * @param currentTime Current timestamp in milliseconds
     * @return The detected transition pattern
     */
    fun analyze(
        transitionHistory: List<AppTransition>,
        currentPackage: String,
        currentTime: Long
    ): TransitionPattern {
        if (transitionHistory.isEmpty()) {
            return TransitionPattern.FIRST_APP_LAUNCH
        }

        val recentTransitions = transitionHistory.takeLast(5)
        val lastTransition = recentTransitions.lastOrNull()

        // Check for notification shade pattern
        if (detectNotificationShadePattern(recentTransitions, currentPackage, currentTime)) {
            return TransitionPattern.NOTIFICATION_PULL
        }

        // Check for recents/task switcher browsing
        if (detectRecentsBrowsingPattern(recentTransitions, currentPackage)) {
            return TransitionPattern.RECENTS_BROWSING
        }

        // Check for quick settings pattern
        if (detectQuickSettingsPattern(recentTransitions, currentPackage)) {
            return TransitionPattern.QUICK_SETTINGS_PULL
        }

        // Check for launcher -> app pattern (direct app launch)
        if (lastTransition != null &&
            isLauncherPackage(lastTransition.fromPackage ?: "") &&
            !isSystemPackage(currentPackage) &&
            currentTime - lastTransition.timestamp < LAUNCHER_TO_APP_TIMEOUT_MS
        ) {
            return TransitionPattern.LAUNCHER_TO_APP
        }

        // Check for app -> launcher -> app pattern (task switching)
        if (recentTransitions.size >= 2) {
            val secondLast = recentTransitions[recentTransitions.size - 2]
            if (!isSystemPackage(secondLast.fromPackage ?: "") &&
                isLauncherPackage(lastTransition?.toPackage ?: "") &&
                !isSystemPackage(currentPackage) &&
                currentTime - secondLast.timestamp < APP_SWITCH_VIA_LAUNCHER_TIMEOUT_MS
            ) {
                return TransitionPattern.APP_SWITCH_VIA_LAUNCHER
            }
        }

        // Check for direct app-to-app switch
        if (lastTransition != null &&
            !isSystemPackage(lastTransition.fromPackage ?: "") &&
            !isSystemPackage(currentPackage) &&
            lastTransition.fromPackage != currentPackage &&
            currentTime - lastTransition.timestamp < DIRECT_APP_SWITCH_TIMEOUT_MS
        ) {
            return TransitionPattern.DIRECT_APP_SWITCH
        }

        // Check if returning to same app after brief launcher/recents visit
        val sameAppTransitions = recentTransitions.filter { it.toPackage == currentPackage }
        if (sameAppTransitions.isNotEmpty() &&
            currentTime - sameAppTransitions.last().timestamp < RETURNING_TO_APP_TIMEOUT_MS
        ) {
            return TransitionPattern.RETURNING_TO_APP
        }

        return TransitionPattern.UNKNOWN
    }

    /**
     * Detects if user pulled down notification shade and returned to same app.
     * Pattern: App -> SystemUI (notification) -> Same App (within 2 seconds)
     */
    fun detectNotificationShadePattern(
        transitions: List<AppTransition>,
        currentPackage: String,
        currentTime: Long
    ): Boolean {
        if (transitions.size >= 2) {
            val previous = transitions[transitions.size - 1]
            val beforePrevious = transitions[transitions.size - 2]

            if (beforePrevious.toPackage == currentPackage &&
                previous.toPackage.contains("systemui") &&
                (previous.className.lowercase().contains("notification") ||
                        previous.className.lowercase().contains("statusbar")) &&
                currentTime - beforePrevious.timestamp < NOTIFICATION_RETURN_TIMEOUT_MS
            ) {
                return true
            }
        }
        return false
    }

    /**
     * Detects if user is browsing recent apps / task switcher.
     */
    fun detectRecentsBrowsingPattern(
        transitions: List<AppTransition>,
        currentPackage: String
    ): Boolean {
        // Pattern: Multiple rapid transitions through recents
        val recentTransitions = transitions.takeLast(3)
        val recentsCount = recentTransitions.count { transition ->
            transition.className.lowercase().let { className ->
                className.contains("recent") || className.contains("task")
            }
        }
        return recentsCount >= 2
    }

    /**
     * Detects if user accessed quick settings and returned to same app.
     * Pattern: App -> SystemUI (quick settings) -> Same App
     */
    fun detectQuickSettingsPattern(
        transitions: List<AppTransition>,
        currentPackage: String
    ): Boolean {
        if (transitions.isNotEmpty()) {
            val last = transitions.last()

            if (last.toPackage.contains("systemui") &&
                (last.className.lowercase().contains("quicksetting") ||
                        last.className.lowercase().contains("brightness") ||
                        last.className.lowercase().contains("volume"))
            ) {
                // Check if we're returning to the same app
                val previousAppTransition = transitions.findLast {
                    !isSystemPackage(it.toPackage) && !isLauncherPackage(it.toPackage)
                }
                return previousAppTransition?.toPackage == currentPackage
            }
        }
        return false
    }

    /**
     * Checks if the system UI is overlay-compatible (notification shade, quick settings, etc.)
     * These are temporary overlays where the user is still "in" the blocked app.
     */
    fun isOverlayCompatibleSystemUI(packageName: String, className: String): Boolean {
        val lowerClass = className.lowercase()
        val lowerPackage = packageName.lowercase()

        // Check if this is the recents/task switcher - NOT overlay compatible
        if (lowerClass.contains("recent") || lowerClass.contains("task")) {
            return false
        }

        // SystemUI package (notification shade, quick settings, volume, etc.)
        if (lowerPackage.contains("systemui")) {
            return true
        }

        // Samsung system UI components
        if (lowerPackage.contains("samsung") &&
            (lowerClass.contains("notification") || lowerClass.contains("panel"))
        ) {
            return true
        }

        // MIUI system UI components
        if (lowerPackage.contains("miui") &&
            (lowerClass.contains("notification") || lowerClass.contains("panel"))
        ) {
            return true
        }

        // OnePlus/Oppo system UI
        if ((lowerPackage.contains("oneplus") || lowerPackage.contains("oppo")) &&
            lowerClass.contains("notification")
        ) {
            return true
        }

        return false
    }
}

/**
 * Represents an app transition event.
 */
data class AppTransition(
    val fromPackage: String?,
    val toPackage: String,
    val timestamp: Long,
    val className: String = ""
)

/**
 * Detected transition patterns.
 */
enum class TransitionPattern {
    /** First app opened after service start */
    FIRST_APP_LAUNCH,

    /** Direct launch from home screen/launcher */
    LAUNCHER_TO_APP,

    /** User went to launcher then opened another app */
    APP_SWITCH_VIA_LAUNCHER,

    /** Direct switch between two apps (e.g., via notification) */
    DIRECT_APP_SWITCH,

    /** User returned to the same app they were in before */
    RETURNING_TO_APP,

    /** User pulled down notification shade and returned */
    NOTIFICATION_PULL,

    /** User is browsing recent apps */
    RECENTS_BROWSING,

    /** User accessed quick settings and returned */
    QUICK_SETTINGS_PULL,

    /** Unknown pattern */
    UNKNOWN
}

package com.minded.minded.detection

import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for TransitionPatternAnalyzer.
 *
 * Tests pattern detection logic for various app navigation scenarios.
 */
class TransitionPatternAnalyzerTest {

    private lateinit var analyzer: TransitionPatternAnalyzer

    // Test packages
    private val youtubePackage = "com.google.android.youtube"
    private val whatsappPackage = "com.whatsapp"
    private val instagramPackage = "com.instagram.android"
    private val launcherPackage = "com.google.android.apps.nexuslauncher"
    private val systemUiPackage = "com.android.systemui"
    private val mindedPackage = "com.minded.minded"

    // Mock system packages
    private val systemPackages = setOf(
        "com.android.systemui",
        "com.android.settings",
        "com.android.phone"
    )

    // Mock launcher packages
    private val launcherPackages = setOf(
        "com.google.android.apps.nexuslauncher",
        "com.android.launcher3",
        "com.miui.home"
    )

    @Before
    fun setup() {
        analyzer = TransitionPatternAnalyzer(
            isSystemPackage = { systemPackages.contains(it) || it.startsWith("com.android.") },
            isLauncherPackage = { launcherPackages.contains(it) }
        )
    }

    // ==================== FIRST_APP_LAUNCH ====================

    @Test
    fun `empty history should return FIRST_APP_LAUNCH`() {
        val pattern = analyzer.analyze(
            transitionHistory = emptyList(),
            currentPackage = youtubePackage,
            currentTime = 1000L
        )
        assertEquals(TransitionPattern.FIRST_APP_LAUNCH, pattern)
    }

    // ==================== LAUNCHER_TO_APP ====================

    @Test
    fun `opening app from launcher should return LAUNCHER_TO_APP`() {
        val history = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = launcherPackage,
                timestamp = 1000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage,
            currentTime = 2000L // Within 2000ms timeout
        )
        assertEquals(TransitionPattern.LAUNCHER_TO_APP, pattern)
    }

    @Test
    fun `opening app from launcher after timeout should return UNKNOWN`() {
        val history = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = launcherPackage,
                timestamp = 1000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage,
            currentTime = 5000L // Beyond 2000ms timeout
        )
        assertEquals(TransitionPattern.UNKNOWN, pattern)
    }

    // ==================== APP_SWITCH_VIA_LAUNCHER ====================

    @Test
    fun `app to launcher to app should return APP_SWITCH_VIA_LAUNCHER`() {
        val history = listOf(
            AppTransition(
                fromPackage = whatsappPackage,
                toPackage = youtubePackage,
                timestamp = 1000L
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = launcherPackage,
                timestamp = 2000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = instagramPackage,
            currentTime = 3500L // Within 3000ms from first transition
        )
        assertEquals(TransitionPattern.APP_SWITCH_VIA_LAUNCHER, pattern)
    }

    // ==================== DIRECT_APP_SWITCH ====================

    @Test
    fun `direct switch between apps should return DIRECT_APP_SWITCH`() {
        val history = listOf(
            AppTransition(
                fromPackage = whatsappPackage,
                toPackage = youtubePackage,
                timestamp = 1000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = instagramPackage,
            currentTime = 1500L // Within 2000ms timeout
        )
        assertEquals(TransitionPattern.DIRECT_APP_SWITCH, pattern)
    }

    @Test
    fun `direct switch after timeout should return UNKNOWN or RETURNING_TO_APP`() {
        val history = listOf(
            AppTransition(
                fromPackage = whatsappPackage,
                toPackage = youtubePackage,
                timestamp = 1000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = instagramPackage,
            currentTime = 3001L // Beyond 2000ms timeout
        )
        // Won't be DIRECT_APP_SWITCH because of timeout
        assertTrue(pattern == TransitionPattern.UNKNOWN || pattern == TransitionPattern.RETURNING_TO_APP)
    }

    // ==================== NOTIFICATION_PULL ====================

    @Test
    fun `notification shade pull and return should return NOTIFICATION_PULL`() {
        val history = listOf(
            AppTransition(
                fromPackage = whatsappPackage,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "com.google.android.youtube.MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 2000L,
                className = "com.android.systemui.statusbar.notification.NotificationShade"
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage, // Returning to same app
            currentTime = 2500L // Within 2000ms of original app
        )
        assertEquals(TransitionPattern.NOTIFICATION_PULL, pattern)
    }

    @Test
    fun `notification shade to different app should NOT return NOTIFICATION_PULL`() {
        val history = listOf(
            AppTransition(
                fromPackage = whatsappPackage,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "com.google.android.youtube.MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 2000L,
                className = "com.android.systemui.statusbar.notification.NotificationShade"
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = whatsappPackage, // Different app!
            currentTime = 2500L
        )
        // Should NOT be NOTIFICATION_PULL since we're going to a different app
        assertTrue(pattern != TransitionPattern.NOTIFICATION_PULL)
    }

    // ==================== RETURNING_TO_APP ====================

    @Test
    fun `returning to recently used app should return RETURNING_TO_APP`() {
        val history = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = whatsappPackage,
                timestamp = 2000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage, // Returning to YouTube
            currentTime = 4000L // Within 5000ms
        )
        assertEquals(TransitionPattern.RETURNING_TO_APP, pattern)
    }

    @Test
    fun `returning to app after timeout should return UNKNOWN`() {
        val history = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = whatsappPackage,
                timestamp = 2000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage,
            currentTime = 10000L // Beyond 5000ms timeout
        )
        assertEquals(TransitionPattern.UNKNOWN, pattern)
    }

    // ==================== RECENTS_BROWSING ====================

    @Test
    fun `multiple recents transitions should return RECENTS_BROWSING`() {
        val history = listOf(
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 1000L,
                className = "com.android.systemui.recents.RecentsActivity"
            ),
            AppTransition(
                fromPackage = systemUiPackage,
                toPackage = systemUiPackage,
                timestamp = 1200L,
                className = "com.android.systemui.recents.RecentsTaskView"
            ),
            AppTransition(
                fromPackage = systemUiPackage,
                toPackage = systemUiPackage,
                timestamp = 1400L,
                className = "com.android.systemui.recents.TaskStackView"
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = whatsappPackage,
            currentTime = 2000L
        )
        assertEquals(TransitionPattern.RECENTS_BROWSING, pattern)
    }

    // ==================== QUICK_SETTINGS_PULL ====================

    @Test
    fun `quick settings pull and return should return QUICK_SETTINGS_PULL`() {
        val history = listOf(
            AppTransition(
                fromPackage = whatsappPackage,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "com.google.android.youtube.MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 2000L,
                className = "com.android.systemui.qs.QuickSettingsPanel"
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage, // Returning to same app
            currentTime = 2500L
        )
        assertEquals(TransitionPattern.QUICK_SETTINGS_PULL, pattern)
    }

    // ==================== isOverlayCompatibleSystemUI ====================

    @Test
    fun `systemui package should be overlay compatible`() {
        assertTrue(analyzer.isOverlayCompatibleSystemUI(
            "com.android.systemui",
            "StatusBarWindowView"
        ))
    }

    @Test
    fun `recents activity should NOT be overlay compatible`() {
        assertFalse(analyzer.isOverlayCompatibleSystemUI(
            "com.android.systemui",
            "RecentsActivity"
        ))
    }

    @Test
    fun `task switcher should NOT be overlay compatible`() {
        assertFalse(analyzer.isOverlayCompatibleSystemUI(
            "com.android.systemui",
            "TaskStackView"
        ))
    }

    @Test
    fun `samsung notification panel should be overlay compatible`() {
        assertTrue(analyzer.isOverlayCompatibleSystemUI(
            "com.samsung.android.systemui",
            "NotificationPanelView"
        ))
    }

    @Test
    fun `miui notification should be overlay compatible`() {
        assertTrue(analyzer.isOverlayCompatibleSystemUI(
            "com.miui.systemui",
            "NotificationPanel"
        ))
    }

    @Test
    fun `oneplus notification should be overlay compatible`() {
        assertTrue(analyzer.isOverlayCompatibleSystemUI(
            "com.oneplus.systemui",
            "NotificationShade"
        ))
    }

    @Test
    fun `random package should NOT be overlay compatible`() {
        assertFalse(analyzer.isOverlayCompatibleSystemUI(
            "com.example.app",
            "MainActivity"
        ))
    }

    // ==================== Pattern Confidence ====================

    @Test
    fun `FIRST_APP_LAUNCH should have high confidence`() {
        assertEquals(0.95f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.FIRST_APP_LAUNCH))
    }

    @Test
    fun `LAUNCHER_TO_APP should have high confidence`() {
        assertEquals(0.95f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.LAUNCHER_TO_APP))
    }

    @Test
    fun `APP_SWITCH_VIA_LAUNCHER should have high confidence`() {
        assertEquals(0.90f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.APP_SWITCH_VIA_LAUNCHER))
    }

    @Test
    fun `DIRECT_APP_SWITCH should have high confidence`() {
        assertEquals(0.85f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.DIRECT_APP_SWITCH))
    }

    @Test
    fun `RETURNING_TO_APP should have low confidence`() {
        assertEquals(0.20f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.RETURNING_TO_APP))
    }

    @Test
    fun `NOTIFICATION_PULL should have low confidence`() {
        assertEquals(0.15f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.NOTIFICATION_PULL))
    }

    @Test
    fun `RECENTS_BROWSING should have very low confidence`() {
        assertEquals(0.10f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.RECENTS_BROWSING))
    }

    @Test
    fun `QUICK_SETTINGS_PULL should have low confidence`() {
        assertEquals(0.15f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.QUICK_SETTINGS_PULL))
    }

    @Test
    fun `UNKNOWN should have medium confidence`() {
        assertEquals(0.50f, TransitionPatternAnalyzer.getPatternConfidence(TransitionPattern.UNKNOWN))
    }

    // ==================== Real-World Bug Scenarios ====================

    @Test
    fun `BUG SCENARIO - notification to unblocked app should be detected`() {
        // This tests the scenario that was causing the bug:
        // YouTube (blocked) -> Notification shade -> WhatsApp (unblocked)
        val history = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 5000L,
                className = "StatusBarNotification"
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = whatsappPackage, // Opening WhatsApp from notification
            currentTime = 6000L
        )

        // This should NOT be NOTIFICATION_PULL because we're going to a different app
        assertTrue(pattern != TransitionPattern.NOTIFICATION_PULL)
        // It should be some kind of valid detection (UNKNOWN is acceptable here)
    }

    @Test
    fun `BUG SCENARIO - returning to blocked app should be detected`() {
        // YouTube (blocked) -> WhatsApp -> YouTube (should show little sun)
        val history = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = whatsappPackage,
                timestamp = 5000L
            )
        )

        val pattern = analyzer.analyze(
            transitionHistory = history,
            currentPackage = youtubePackage, // Returning to YouTube
            currentTime = 8000L
        )

        // This is RETURNING_TO_APP which has low confidence, but the fix
        // bypasses pattern detection for user-to-user app switches
        assertEquals(TransitionPattern.RETURNING_TO_APP, pattern)
    }

    // ==================== detectNotificationShadePattern ====================

    @Test
    fun `detectNotificationShadePattern with statusbar class should return true`() {
        val transitions = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 2000L,
                className = "StatusBarWindowView"
            )
        )

        val result = analyzer.detectNotificationShadePattern(
            transitions = transitions,
            currentPackage = youtubePackage,
            currentTime = 2500L
        )
        assertTrue(result)
    }

    @Test
    fun `detectNotificationShadePattern to different app should return false`() {
        val transitions = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 2000L,
                className = "NotificationShade"
            )
        )

        val result = analyzer.detectNotificationShadePattern(
            transitions = transitions,
            currentPackage = whatsappPackage, // Different app!
            currentTime = 2500L
        )
        assertFalse(result)
    }

    @Test
    fun `detectNotificationShadePattern after timeout should return false`() {
        val transitions = listOf(
            AppTransition(
                fromPackage = null,
                toPackage = youtubePackage,
                timestamp = 1000L,
                className = "MainActivity"
            ),
            AppTransition(
                fromPackage = youtubePackage,
                toPackage = systemUiPackage,
                timestamp = 2000L,
                className = "NotificationShade"
            )
        )

        val result = analyzer.detectNotificationShadePattern(
            transitions = transitions,
            currentPackage = youtubePackage,
            currentTime = 5000L // Beyond 2000ms timeout from original transition
        )
        assertFalse(result)
    }
}

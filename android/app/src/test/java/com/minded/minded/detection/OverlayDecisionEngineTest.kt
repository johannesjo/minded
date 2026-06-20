package com.minded.minded.detection

import org.junit.Before
import org.junit.Test
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

/**
 * Unit tests for OverlayDecisionEngine.
 *
 * Tests the pure business logic for overlay display decisions.
 */
class OverlayDecisionEngineTest {

    private lateinit var engine: OverlayDecisionEngine

    // Test packages
    private val youtubePackage = "com.google.android.youtube"
    private val whatsappPackage = "com.whatsapp"
    private val mindedPackage = "com.minded.minded"
    private val launcherPackage = "com.google.android.apps.nexuslauncher"

    // Default blocked apps
    private val blockedApps = setOf(youtubePackage, "com.instagram.android")

    @Before
    fun setup() {
        engine = OverlayDecisionEngine()
    }

    // ==================== Basic Decision Tests ====================

    @Test
    fun `should skip own package`() {
        val state = createState(blockedApps = blockedApps)

        val decision = engine.decide(mindedPackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.OWN_PACKAGE, decision.reason)
    }

    @Test
    fun `should hide all for unblocked app`() {
        val state = createState(blockedApps = blockedApps)

        val decision = engine.decide(whatsappPackage, state)

        assertEquals(OverlayDecision.HideAll, decision)
    }

    @Test
    fun `should hide all for launcher package`() {
        val state = createState(blockedApps = blockedApps)

        val decision = engine.decide(launcherPackage, state)

        assertEquals(OverlayDecision.HideAll, decision)
    }

    @Test
    fun `should hide all for home package`() {
        val state = createState(blockedApps = blockedApps)

        val decision = engine.decide("com.miui.home", state)

        assertEquals(OverlayDecision.HideAll, decision)
    }

    @Test
    fun `should show intervention for blocked app without session`() {
        val state = createState(
            blockedApps = blockedApps,
            appSessionEndTime = null,
            activeTimerEndTime = null
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should show little sun for blocked app with active session`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            appSessionEndTime = currentTime + 60000 // Session ends in 1 minute
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowLittleSun, decision)
    }

    @Test
    fun `should show little sun when active timer exists`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime + 60000 // Timer ends in 1 minute
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowLittleSun, decision)
    }

    @Test
    fun `should show intervention when session has expired`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            appSessionEndTime = currentTime - 1000 // Session ended 1 second ago
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    // ==================== Debouncing Tests ====================

    @Test
    fun `should skip when recently hid all overlays`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            lastHideAllTimestamp = currentTime - 200 // Only 200ms ago
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.RECENT_HIDE_ALL, decision.reason)
    }

    @Test
    fun `should not skip when hide all debounce has passed`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            lastHideAllTimestamp = currentTime - 600 // 600ms ago, beyond 500ms debounce
        )

        val decision = engine.decide(youtubePackage, state)

        // Should proceed to show intervention (not skip)
        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should skip when user recently switched to app`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            lastGoToAppTimestamp = currentTime - 100 // Only 100ms ago
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.RECENT_APP_SWITCH, decision.reason)
    }

    @Test
    fun `should not skip when app switch debounce has passed`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            lastGoToAppTimestamp = currentTime - 400 // 400ms ago, beyond 300ms debounce
        )

        val decision = engine.decide(youtubePackage, state)

        // Should proceed to show intervention (not skip)
        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    // ==================== Overlay Already Showing Tests ====================

    @Test
    fun `should skip when overlay is already showing`() {
        val state = createState(
            blockedApps = blockedApps,
            isAnyOverlayShowing = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.OVERLAY_ALREADY_SHOWING, decision.reason)
    }

    // ==================== Session Priority Tests ====================

    @Test
    fun `app session should take priority over active timer`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            appSessionEndTime = currentTime + 30000, // App session: 30s
            activeTimerEndTime = currentTime + 60000 // Global timer: 60s
        )

        val decision = engine.decide(youtubePackage, state)

        // Should show little sun because app session is active
        assertEquals(OverlayDecision.ShowLittleSun, decision)
    }

    @Test
    fun `should fall back to active timer when no app session`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            appSessionEndTime = null,
            activeTimerEndTime = currentTime + 60000 // Global timer active
        )

        val decision = engine.decide(youtubePackage, state)

        // Should show little sun because global timer is active
        assertEquals(OverlayDecision.ShowLittleSun, decision)
    }

    // ==================== Sleep Wind-Down Tests ====================

    @Test
    fun `should show sleep wind down for blocked app when wind down is active`() {
        val state = createState(
            blockedApps = blockedApps,
            isWindDownActive = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowSleepWindDown, decision)
    }

    @Test
    fun `should show little sun timer for blocked app when wind down is snoozed`() {
        val state = createState(
            blockedApps = blockedApps,
            isWindDownSnoozed = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowWindDownSnoozeTimer, decision)
    }

    @Test
    fun `should show sleep wind down after snooze timer expires inside wind down window`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime - 1000,
            isWindDownActive = true,
            isWindDownSnoozed = false
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowSleepWindDown, decision)
    }

    @Test
    fun `should show sleep wind down after snooze expires even when an active timer remains`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime + 60000,
            isWindDownActive = true,
            isWindDownSnoozed = false
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowSleepWindDown, decision)
    }

    @Test
    fun `wind down snooze should show little sun over active timer`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime + 60000,
            isWindDownSnoozed = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowWindDownSnoozeTimer, decision)
    }

    @Test
    fun `should skip when sleep wind down overlay is already showing`() {
        val state = createState(
            blockedApps = blockedApps,
            isWindDownActive = true,
            isSleepWindDownOverlayShowing = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.OVERLAY_ALREADY_SHOWING, decision.reason)
    }

    @Test
    fun `wind down should take priority over rest of day timer`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime + 60000,
            activeTimerDurationS = -1,
            isWindDownActive = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowSleepWindDown, decision)
    }

    @Test
    fun `wind down snooze should show little sun over rest of day timer`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime + 60000,
            activeTimerDurationS = -1,
            isWindDownSnoozed = true
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowWindDownSnoozeTimer, decision)
    }

    @Test
    fun `should hide all for active rest of day timer outside wind down`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            activeTimerEndTime = currentTime + 60000,
            activeTimerDurationS = -1
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.HideAll, decision)
    }

    // ==================== shouldResetSessionDuration Tests ====================

    @Test
    fun `should reset session when app unused for threshold time`() {
        val currentTime = Instant.now()
        val lastUsedTime = currentTime.minusSeconds(25) // 25 seconds ago

        val shouldReset = engine.shouldResetSessionDuration(lastUsedTime, currentTime)

        assertTrue(shouldReset)
    }

    @Test
    fun `should not reset session when app recently used`() {
        val currentTime = Instant.now()
        val lastUsedTime = currentTime.minusSeconds(10) // Only 10 seconds ago

        val shouldReset = engine.shouldResetSessionDuration(lastUsedTime, currentTime)

        assertFalse(shouldReset)
    }

    @Test
    fun `should not reset session when lastUsedTime is null`() {
        val currentTime = Instant.now()

        val shouldReset = engine.shouldResetSessionDuration(null, currentTime)

        assertFalse(shouldReset)
    }

    @Test
    fun `should reset session exactly at threshold`() {
        val currentTime = Instant.now()
        val lastUsedTime = currentTime.minusSeconds(21) // 21 seconds ago (> 20 threshold)

        val shouldReset = engine.shouldResetSessionDuration(lastUsedTime, currentTime)

        assertTrue(shouldReset)
    }

    // ==================== Real-World Bug Scenarios ====================

    @Test
    fun `BUG SCENARIO - WhatsApp from notification should hide overlay`() {
        // User on YouTube (blocked), taps WhatsApp notification
        val state = createState(
            blockedApps = blockedApps,
            isAnyOverlayShowing = true // Little sun was showing
        )

        // WhatsApp is not blocked
        val decision = engine.decide(whatsappPackage, state)

        // Should hide all overlays
        assertEquals(OverlayDecision.HideAll, decision)
    }

    @Test
    fun `BUG SCENARIO - returning to blocked app should show little sun`() {
        // User returns to YouTube after using WhatsApp
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            appSessionEndTime = currentTime + 30000, // Session still active
            isAnyOverlayShowing = false // Overlay was hidden when in WhatsApp
        )

        val decision = engine.decide(youtubePackage, state)

        // Should show little sun because session is still active
        assertEquals(OverlayDecision.ShowLittleSun, decision)
    }

    @Test
    fun `BUG SCENARIO - intervention should stay visible during notification shade`() {
        // User pulls down notification shade while intervention is showing
        // This tests that we don't trigger a new decision while overlay is showing
        val state = createState(
            blockedApps = blockedApps,
            isAnyOverlayShowing = true
        )

        val decision = engine.decide(youtubePackage, state)

        // Should skip because overlay is already showing
        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.OVERLAY_ALREADY_SHOWING, decision.reason)
    }

    @Test
    fun `BUG SCENARIO - little sun should not flash when completing intervention`() {
        // User completes intervention, little sun shows, but should not re-trigger
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            appSessionEndTime = currentTime + 60000,
            isAnyOverlayShowing = true, // Little sun is showing
            lastHideAllTimestamp = currentTime - 100 // Very recent
        )

        val decision = engine.decide(youtubePackage, state)

        // Should skip - not try to show another overlay
        assertIs<OverlayDecision.Skip>(decision)
    }

    // ==================== Edge Cases ====================

    @Test
    fun `empty blocked apps should hide for any app`() {
        val state = createState(blockedApps = emptySet())

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.HideAll, decision)
    }

    @Test
    fun `decision order - own package checked first`() {
        // Even if blocked, own package should be skipped
        val state = createState(
            blockedApps = setOf(mindedPackage), // Our package is "blocked"
            isAnyOverlayShowing = false
        )

        val decision = engine.decide(mindedPackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.OWN_PACKAGE, decision.reason)
    }

    @Test
    fun `decision order - debounce checked before blocked status`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            lastHideAllTimestamp = currentTime - 100 // Recent hide
        )

        val decision = engine.decide(youtubePackage, state)

        // Should skip due to debounce even though app is blocked
        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.RECENT_HIDE_ALL, decision.reason)
    }

    // ==================== Helper Functions ====================

    private fun createState(
        blockedApps: Set<String>,
        currentTime: Long = System.currentTimeMillis(),
        lastHideAllTimestamp: Long = 0L,
        lastGoToAppTimestamp: Long = 0L,
        isAnyOverlayShowing: Boolean = false,
        isSleepWindDownOverlayShowing: Boolean = false,
        appSessionEndTime: Long? = null,
        activeTimerEndTime: Long? = null,
        activeTimerDurationS: Int? = null,
        isWindDownActive: Boolean = false,
        isWindDownSnoozed: Boolean = false
    ): OverlayState {
        return OverlayState(
            ownPackage = mindedPackage,
            blockedApps = blockedApps,
            currentTime = currentTime,
            lastHideAllTimestamp = lastHideAllTimestamp,
            lastGoToAppTimestamp = lastGoToAppTimestamp,
            isAnyOverlayShowing = isAnyOverlayShowing,
            isSleepWindDownOverlayShowing = isSleepWindDownOverlayShowing,
            appSessionEndTime = appSessionEndTime,
            activeTimerEndTime = activeTimerEndTime,
            activeTimerDurationS = activeTimerDurationS,
            isWindDownActive = isWindDownActive,
            isWindDownSnoozed = isWindDownSnoozed
        )
    }
}

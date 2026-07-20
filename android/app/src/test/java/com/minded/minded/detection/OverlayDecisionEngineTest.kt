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
    fun `wind down uses the standard intervention when no session is active`() {
        val state = createState(
            blockedApps = blockedApps,
            isWindDownActive = true,
            appSessionEndTime = null,
            activeTimerEndTime = null
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `wind down keeps the little sun when a session is active`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            isWindDownActive = true,
            appSessionEndTime = currentTime + 60000
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowLittleSun, decision)
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

    // ==================== Liveness Gate 2a: Stale Detection ====================

    @Test
    fun `should skip when detection emit timestamp is too old`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime -
                (OverlayDecisionEngine.STALE_SHOW_THRESHOLD_MS + 500)
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.STALE_DETECTION, decision.reason)
    }

    @Test
    fun `should not skip when detection emit timestamp is fresh`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime - 200 // well within threshold
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should not skip on stale detection when timestamp is zero`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = 0L // no detection timestamp available
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should not skip on stale detection when timestamp is in the future (clock skew)`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime + 5000 // negative age
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    // ==================== Liveness Gate 2b: Stale Foreground ====================

    @Test
    fun `should skip when fresh foreground is a different app`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp = currentTime - 200 // fresh
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.STALE_FOREGROUND, decision.reason)
    }

    @Test
    fun `should not skip when fresh foreground matches target app`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            freshestForegroundPackage = youtubePackage, // same as target
            freshestForegroundTimestamp = currentTime - 200
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should not skip when contradicting foreground is stale`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp = currentTime -
                (OverlayDecisionEngine.FOREGROUND_FRESH_WINDOW_MS + 500) // too old
        )

        val decision = engine.decide(youtubePackage, state)

        // Stale evidence is no evidence - default to allowing the draw
        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should not skip when foreground holder is absent`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            freshestForegroundPackage = null
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should not skip when contradicting foreground timestamp is in the future (clock skew)`() {
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp = currentTime + 5000 // negative age
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should not skip when contradicting foreground is older than the detection`() {
        // A holder value that predates this detection must not suppress it (e.g.
        // the high-confidence path emitted with a null focus read, leaving a
        // prior app in the holder). Recent by the window, but stale vs. the
        // detection -> allow the draw.
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp = currentTime - 1000 // within window, but older than the detection
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should skip when contradicting foreground is newer than the detection`() {
        // Foreground evidence that postdates the detection is trustworthy: the
        // user really did move on after the detection fired -> skip the draw.
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime - 1000,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp = currentTime - 100 // newer than the detection, fresh
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.STALE_FOREGROUND, decision.reason)
    }

    // ==================== Liveness Gate: Threshold Boundaries ====================

    @Test
    fun `should not skip when detection age is exactly at the stale threshold`() {
        // Guard 2a uses strict `>`: at age == STALE_SHOW_THRESHOLD_MS the detection
        // is still considered deliverable. Pins the operator against an off-by-one.
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime - OverlayDecisionEngine.STALE_SHOW_THRESHOLD_MS
        )

        val decision = engine.decide(youtubePackage, state)

        assertEquals(OverlayDecision.ShowIntervention, decision)
    }

    @Test
    fun `should skip when contradicting foreground age is exactly at the fresh window edge`() {
        // Guard 2b's window is inclusive (`in 0..FOREGROUND_FRESH_WINDOW_MS`): at age
        // == the window edge the evidence still counts. Pins the inclusive bound.
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp =
                currentTime - OverlayDecisionEngine.FOREGROUND_FRESH_WINDOW_MS
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.STALE_FOREGROUND, decision.reason)
    }

    @Test
    fun `should skip when contradicting foreground is exactly as new as the detection`() {
        // Guard 2b uses `>=`: foreground evidence with the same timestamp as the
        // detection is trustworthy and suppresses. Pins the equality edge.
        val currentTime = System.currentTimeMillis()
        val state = createState(
            blockedApps = blockedApps,
            currentTime = currentTime,
            detectionTimestamp = currentTime - 500,
            freshestForegroundPackage = whatsappPackage,
            freshestForegroundTimestamp = currentTime - 500 // equal to the detection, fresh
        )

        val decision = engine.decide(youtubePackage, state)

        assertIs<OverlayDecision.Skip>(decision)
        assertEquals(SkipReason.STALE_FOREGROUND, decision.reason)
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
        isWindDownSnoozed: Boolean = false,
        detectionTimestamp: Long = 0L,
        freshestForegroundPackage: String? = null,
        freshestForegroundTimestamp: Long = 0L
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
            isWindDownSnoozed = isWindDownSnoozed,
            detectionTimestamp = detectionTimestamp,
            freshestForegroundPackage = freshestForegroundPackage,
            freshestForegroundTimestamp = freshestForegroundTimestamp
        )
    }
}

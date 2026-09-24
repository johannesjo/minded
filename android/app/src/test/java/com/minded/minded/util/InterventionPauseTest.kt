package com.minded.minded.util

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InterventionPauseTest {

    private val now = 1_800_000_000_000L
    private val laterWeek = InterventionPause(INTERVENTION_PAUSE_KIND_LATER, now + 1_000L)

    @Test
    fun `a chosen week is active only until it ends`() {
        assertEquals(INTERVENTION_PAUSE_KIND_LATER, activeInterventionPauseKind(laterWeek, now))
        assertNull(activeInterventionPauseKind(laterWeek, laterWeek.untilTS))
        assertNull(activeInterventionPauseKind(null, now))
    }

    private val recent = now - 1_000L
    private val asNowWeek = InterventionPause("as_now", now + 1_000L)

    @Test
    fun `the check-in is due from the threshold on, unless an answer stands`() {
        assertFalse(isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD - 1, recent, null, now))
        assertTrue(isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD, recent, null, now))
        assertFalse(isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD, recent, laterWeek, now))
        assertFalse(isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD, recent, asNowWeek, now))
        assertTrue(
            isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD, recent, laterWeek, laterWeek.untilTS)
        )
    }

    @Test
    fun `the check-in only says lately when the last pass was recent`() {
        val tooOld = now - SKIP_STREAK_MAX_GAP_MS - 1
        assertFalse(isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD, tooOld, null, now))
        assertFalse(isSkipCheckInDue(SKIP_CHECK_IN_THRESHOLD, 0L, null, now))
    }

    @Test
    fun `a pass counts, starts over after a long gap, and freezes while an answer stands`() {
        assertEquals(4, skipStreakAfterSkip(3, recent, null, now))
        assertEquals(1, skipStreakAfterSkip(9, now - SKIP_STREAK_MAX_GAP_MS - 1, null, now))
        assertEquals(1, skipStreakAfterSkip(0, 0L, null, now))
        assertNull(skipStreakAfterSkip(0, recent, laterWeek, now))
    }

    @Test
    fun `a later week hands back after ten minutes, or a longer grace`() {
        assertEquals(600, laterPauseAtSessionS(sessionGraceEnabled = false, sessionGraceMinutes = 30))
        assertEquals(600, laterPauseAtSessionS(sessionGraceEnabled = true, sessionGraceMinutes = 5))
        assertEquals(1800, laterPauseAtSessionS(sessionGraceEnabled = true, sessionGraceMinutes = 30))
    }

    @Test
    fun `a pass at bedtime never counts - the check-in can't ask there`() {
        assertNull(skipStreakAfterSkip(3, recent, null, now, isBedtime = true))
    }

    @Test
    fun `only unlocked seconds bring a later week's pause`() {
        assertEquals(11, unlockedSessionAfterTick(10, isUnlocked = true))
        assertEquals(10, unlockedSessionAfterTick(10, isUnlocked = false))

        assertTrue(shouldHandBackToPause(600, 600, isUnlocked = true))
        assertFalse(shouldHandBackToPause(600, 599, isUnlocked = true))
        // Behind the lock screen it waits, even once due.
        assertFalse(shouldHandBackToPause(600, 900, isUnlocked = false))
        // A plain bubble (no later week) never hands back.
        assertFalse(shouldHandBackToPause(null, 900, isUnlocked = true))
    }
}

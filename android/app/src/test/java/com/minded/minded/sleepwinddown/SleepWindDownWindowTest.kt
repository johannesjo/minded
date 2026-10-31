package com.minded.minded.sleepwinddown

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SleepWindDownWindowTest {
    private val now = 1_800_000_000_000L
    private val tonight = "2027-01-15"

    @Test
    fun `a lapsed snooze no longer stands - it must not end every Little Sun at once`() {
        assertNull(SleepWindDownWindow.activeSnoozeEndMs(tonight, "", now - 60_000, now))
    }

    @Test
    fun `a snooze left over from an earlier night is ignored`() {
        val weeksAgo = now - 21L * 24 * 3600 * 1000
        assertNull(SleepWindDownWindow.activeSnoozeEndMs(tonight, "2026-12-01", weeksAgo, now))
    }

    @Test
    fun `a snooze still running inside the bedtime window stands`() {
        assertEquals(
            now + 60_000,
            SleepWindDownWindow.activeSnoozeEndMs(tonight, "", now + 60_000, now),
        )
    }

    @Test
    fun `no snooze outside the bedtime window or once tonight is dismissed`() {
        assertNull(SleepWindDownWindow.activeSnoozeEndMs(null, "", now + 60_000, now))
        assertNull(SleepWindDownWindow.activeSnoozeEndMs(tonight, tonight, now + 60_000, now))
    }

    @Test
    fun `an unset snooze is none`() {
        assertNull(SleepWindDownWindow.activeSnoozeEndMs(tonight, "", 0L, now))
    }

    @Test
    fun `a snooze ending exactly now no longer stands`() {
        assertNull(SleepWindDownWindow.activeSnoozeEndMs(tonight, "", now, now))
    }
}

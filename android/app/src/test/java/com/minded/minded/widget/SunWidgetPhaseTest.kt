package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals

class SunWidgetPhaseTest {

    @Test
    fun `night holds through the small hours and late evening`() {
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(0))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(3))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(4))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(21))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(23))
    }

    @Test
    fun `day covers the waking daylight hours`() {
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(5))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(9))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(12))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(16))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(20))
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(SunWidgetPhase.forHour(0), SunWidgetPhase.forHour(24))
        assertEquals(SunWidgetPhase.forHour(2), SunWidgetPhase.forHour(26))
        assertEquals(SunWidgetPhase.forHour(23), SunWidgetPhase.forHour(-1))
    }

    @Test
    fun `minutes until next boundary counts toward the upcoming phase`() {
        // 04:30 -> day at 05:00 is 30 minutes away.
        assertEquals(30, SunWidgetPhase.minutesUntilNextBoundary(4, 30))
        // 09:00 -> night at 21:00 is 12h away.
        assertEquals(12 * 60, SunWidgetPhase.minutesUntilNextBoundary(9, 0))
        // 20:15 -> night at 21:00 is 45 minutes away.
        assertEquals(45, SunWidgetPhase.minutesUntilNextBoundary(20, 15))
    }

    @Test
    fun `landing exactly on a boundary schedules the next one, never zero`() {
        // 05:00 is the day boundary; the next change is the moon at 21:00 (16h away).
        assertEquals(16 * 60, SunWidgetPhase.minutesUntilNextBoundary(5, 0))
    }

    @Test
    fun `after the last boundary it wraps to day tomorrow`() {
        // 22:00 -> day at 05:00 next day = 7 hours.
        assertEquals(7 * 60, SunWidgetPhase.minutesUntilNextBoundary(22, 0))
        // 23:30 -> day at 05:00 next day = 5h30m.
        assertEquals(5 * 60 + 30, SunWidgetPhase.minutesUntilNextBoundary(23, 30))
    }
}

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
    fun `dawn covers early morning`() {
        assertEquals(SunWidgetPhase.DAWN, SunWidgetPhase.forHour(5))
        assertEquals(SunWidgetPhase.DAWN, SunWidgetPhase.forHour(8))
    }

    @Test
    fun `day covers the bright middle of the day`() {
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(9))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(12))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(16))
    }

    @Test
    fun `dusk covers the golden evening`() {
        assertEquals(SunWidgetPhase.DUSK, SunWidgetPhase.forHour(17))
        assertEquals(SunWidgetPhase.DUSK, SunWidgetPhase.forHour(20))
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(SunWidgetPhase.forHour(0), SunWidgetPhase.forHour(24))
        assertEquals(SunWidgetPhase.forHour(2), SunWidgetPhase.forHour(26))
        assertEquals(SunWidgetPhase.forHour(23), SunWidgetPhase.forHour(-1))
    }

    @Test
    fun `minutes until next boundary counts toward the upcoming phase`() {
        // 04:30 -> dawn at 05:00 is 30 minutes away.
        assertEquals(30, SunWidgetPhase.minutesUntilNextBoundary(4, 30))
        // 09:00 -> dusk at 17:00 (the next boundary after the day one) is 8h away.
        assertEquals(8 * 60, SunWidgetPhase.minutesUntilNextBoundary(9, 0))
        // 16:15 -> dusk at 17:00 is 45 minutes away.
        assertEquals(45, SunWidgetPhase.minutesUntilNextBoundary(16, 15))
    }

    @Test
    fun `landing exactly on a boundary schedules the next one, never zero`() {
        // 05:00 is the dawn boundary; the next change is day at 09:00 (4h away).
        assertEquals(4 * 60, SunWidgetPhase.minutesUntilNextBoundary(5, 0))
    }

    @Test
    fun `after the last boundary it wraps to dawn tomorrow`() {
        // 22:00 -> dawn at 05:00 next day = 7 hours.
        assertEquals(7 * 60, SunWidgetPhase.minutesUntilNextBoundary(22, 0))
        // 23:30 -> dawn at 05:00 next day = 5h30m.
        assertEquals(5 * 60 + 30, SunWidgetPhase.minutesUntilNextBoundary(23, 30))
    }
}

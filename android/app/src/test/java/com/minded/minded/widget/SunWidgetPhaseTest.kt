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
}

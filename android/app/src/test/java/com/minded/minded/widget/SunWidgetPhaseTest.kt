package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals

class SunWidgetPhaseTest {

    @Test
    fun `night holds from the app's 19h boundary through to dawn`() {
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(0))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(3))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(5)) // before day-start
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(19)) // moon at 19
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(20))
        assertEquals(SunWidgetPhase.NIGHT, SunWidgetPhase.forHour(23))
    }

    @Test
    fun `day covers the app's 06-19 light window`() {
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(6)) // sun at 06
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(9))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(12))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(16))
        assertEquals(SunWidgetPhase.DAY, SunWidgetPhase.forHour(18)) // last day hour
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(SunWidgetPhase.forHour(0), SunWidgetPhase.forHour(24))
        assertEquals(SunWidgetPhase.forHour(2), SunWidgetPhase.forHour(26))
        assertEquals(SunWidgetPhase.forHour(23), SunWidgetPhase.forHour(-1))
    }
}

package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class WidgetSkyTest {

    @Test
    fun `the sky walks the day's keyframes in order`() {
        assertEquals(WidgetSky.DAWN, WidgetSky.forHour(5))
        assertEquals(WidgetSky.DAWN, WidgetSky.forHour(8))
        assertEquals(WidgetSky.MORNING, WidgetSky.forHour(9))
        assertEquals(WidgetSky.MORNING, WidgetSky.forHour(12))
        assertEquals(WidgetSky.MIDDAY, WidgetSky.forHour(13))
        assertEquals(WidgetSky.MIDDAY, WidgetSky.forHour(16))
        assertEquals(WidgetSky.AFTERNOON, WidgetSky.forHour(17))
        assertEquals(WidgetSky.AFTERNOON, WidgetSky.forHour(18))
        assertEquals(WidgetSky.DUSK, WidgetSky.forHour(19))
        assertEquals(WidgetSky.DUSK, WidgetSky.forHour(20))
        assertEquals(WidgetSky.NIGHT, WidgetSky.forHour(21))
        assertEquals(WidgetSky.NIGHT, WidgetSky.forHour(0))
        assertEquals(WidgetSky.NIGHT, WidgetSky.forHour(4))
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(WidgetSky.forHour(9), WidgetSky.forHour(33))
        assertEquals(WidgetSky.forHour(23), WidgetSky.forHour(-1))
    }

    @Test
    fun `the dark sky shows exactly when the moon does`() {
        // The near-black prompt text is only legible on the light day skies, and
        // the text window is the sun's window (WidgetPromptsTest). Tying the dark
        // sky exactly to the moon's phase closes the loop: text can never meet a
        // dark sky. Built from SunWidgetPhase's constants by construction — this
        // guards the construction.
        for (hour in 0..23) {
            assertEquals(
                SunWidgetPhase.forHour(hour) == SunWidgetPhase.NIGHT,
                WidgetSky.forHour(hour) == WidgetSky.NIGHT,
                "hour $hour",
            )
        }
    }

    @Test
    fun `sky boundaries cover the phase and prompt boundaries`() {
        // The receiver arms its single alarm off the sky schedule alone, so the
        // sky must step at least as often as the sun flips phase or the line
        // turns over — otherwise a stale face could strand on screen.
        for (hour in 0..23) {
            val sky = WidgetSky.minutesUntilNextChange(hour, 0)
            assertTrue(
                sky <= SunWidgetPhase.minutesUntilNextBoundary(hour, 0),
                "phase at hour $hour",
            )
            assertTrue(
                sky <= WidgetPrompts.minutesUntilNextChange(hour, 0),
                "prompt at hour $hour",
            )
        }
    }

    @Test
    fun `minutes until next change counts toward the upcoming step`() {
        // 08:30 -> morning at 09:00.
        assertEquals(30, WidgetSky.minutesUntilNextChange(8, 30))
        // 13:00 (a boundary) -> next step at 17:00, never an immediate re-fire.
        assertEquals(4 * 60, WidgetSky.minutesUntilNextChange(13, 0))
        // 22:00 -> dawn at 05:00 next day = 7 hours.
        assertEquals(7 * 60, WidgetSky.minutesUntilNextChange(22, 0))
    }
}

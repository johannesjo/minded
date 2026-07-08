package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals

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
}

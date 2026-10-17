package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals

class WidgetSkyTest {

    @Test
    fun `the sky walks the day's keyframes in order`() {
        assertEquals(WidgetSky.NIGHT, WidgetSky.forHour(5)) // before the 06 day-start
        assertEquals(WidgetSky.DAWN, WidgetSky.forHour(6))
        assertEquals(WidgetSky.DAWN, WidgetSky.forHour(8))
        assertEquals(WidgetSky.MORNING, WidgetSky.forHour(9))
        assertEquals(WidgetSky.MORNING, WidgetSky.forHour(12))
        assertEquals(WidgetSky.MIDDAY, WidgetSky.forHour(13))
        assertEquals(WidgetSky.MIDDAY, WidgetSky.forHour(16))
        assertEquals(WidgetSky.AFTERNOON, WidgetSky.forHour(17))
        assertEquals(WidgetSky.DUSK, WidgetSky.forHour(18)) // last light before night
        // Moon, in step with the app - over the sunset's afterglow at first.
        assertEquals(WidgetSky.NIGHTFALL, WidgetSky.forHour(19))
        assertEquals(WidgetSky.NIGHTFALL, WidgetSky.forHour(20)) // afterglow 0.5
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
        // dark sky. Built from SunWidgetPhase's constants by construction - this
        // guards the construction.
        for (hour in 0..23) {
            assertEquals(
                SunWidgetPhase.forHour(hour) == SunWidgetPhase.NIGHT,
                WidgetSky.forHour(hour).isNight,
                "hour $hour",
            )
        }
    }

    @Test
    fun `nightfall holds while the afterglow is at or above the threshold`() {
        assertEquals(WidgetSky.NIGHTFALL, WidgetSky.forAfterglow(1.0))
        assertEquals(WidgetSky.NIGHTFALL, WidgetSky.forAfterglow(WidgetSky.NIGHTFALL_MIN_AFTERGLOW))
        assertEquals(WidgetSky.NIGHT, WidgetSky.forAfterglow(WidgetSky.NIGHTFALL_MIN_AFTERGLOW - 0.01))
        assertEquals(WidgetSky.NIGHT, WidgetSky.forAfterglow(0.0))
    }
}

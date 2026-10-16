package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WidgetSunSpotTest {

    @Test
    fun `the bare sun and the lone moon sit in the middle of their tile`() {
        val spot = WidgetSunSpot.inTile(100f, 100f, 75f)
        assertEquals(0.5f, spot.centerX)
        assertEquals(0.5f, spot.centerY)
        assertEquals(0.5f, spot.discOfWidth, 0.001f) // 75dp image, 2/3 of it disc
    }

    @Test
    fun `beneath a line the sun sits below the middle`() {
        val spot = WidgetSunSpot.inTile(250f, 180f, 54f, "Feel both feet on the floor.", 18f)
        assertEquals(0.5f, spot.centerX)
        assertTrue(spot.centerY > 0.5f && spot.centerY < 1f, "centre ${spot.centerY}")
    }

    @Test
    fun `the launch hint is the sun's centre on the display, and its disc in dp`() {
        val spot = WidgetSunSpot.Spot(0.5f, 0.5f, 0.5f)
        // A 300px tile at (100, 1000) on a 1080x2400 display, density 3.
        assertEquals(
            "0.2315,0.4792,50.0",
            WidgetSunSpot.toLaunchParam(spot, 100, 1000, 300, 300, 1080, 2400, 3f),
        )
    }

    @Test
    fun `anything off yields no hint, so the app rises from the bar`() {
        val spot = WidgetSunSpot.Spot(0.5f, 0.5f, 0.5f)
        assertNull(WidgetSunSpot.toLaunchParam(spot, 0, 0, 0, 300, 1080, 2400, 3f))
        assertNull(WidgetSunSpot.toLaunchParam(spot, 0, 0, 300, 300, 0, 2400, 3f))
        // Off the display (a stale or bogus bounds rect).
        assertNull(WidgetSunSpot.toLaunchParam(spot, 5000, 0, 300, 300, 1080, 2400, 3f))
        assertNull(WidgetSunSpot.Spot.fromArray(floatArrayOf(0.5f)))
    }
}

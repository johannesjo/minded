package com.minded.minded.widget

import org.junit.Test
import kotlin.math.abs
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WidgetMoonTest {

    private data class MoonFixture(val epochMillis: Long, val cycle: Double, val illumination: Double, val isWaxing: Boolean)

    // Expected values from the app's own lunarPhase.moonPhaseAt - one moon, the
    // same phase on the home screen as in the app. widgetSolarMirror.test.ts
    // re-derives every row from the TS on each jest run.
    private val fixtures = listOf(
        MoonFixture(1792188000000L, 0.187332, 0.308172, true),
        MoonFixture(1767594600000L, 0.548316, 0.977137, false),
        MoonFixture(1782073800000L, 0.223222, 0.416272, true),
        MoonFixture(1797870600000L, 0.414543, 0.929638, true),
    )

    @Test
    fun `matches the app's moon phase`() {
        for (f in fixtures) {
            val phase = WidgetMoon.phaseAt(f.epochMillis)
            assertEquals(f.cycle, phase.cycle, 1e-5, "cycle @ ${f.epochMillis}")
            assertEquals(f.illumination, phase.illumination, 1e-5, "lit @ ${f.epochMillis}")
            assertEquals(f.isWaxing, phase.isWaxing)
        }
    }

    @Test
    fun `a full moon has no night side to draw`() {
        assertNull(WidgetMoon.luneOutline(WidgetMoon.Phase(0.5, 1.0, false), false))
    }

    @Test
    fun `a waxing crescent is lit on the right in the north, on the left in the south`() {
        val crescent = WidgetMoon.Phase(0.15, (1 - kotlin.math.cos(2 * Math.PI * 0.15)) / 2, true)
        val north = assertNotNull(WidgetMoon.luneOutline(crescent, false))
        val south = assertNotNull(WidgetMoon.luneOutline(crescent, true))
        assertTrue(north.all { it.first >= 50f - 1e-3f }, "north: lune on the right")
        assertTrue(south.all { it.first <= 50f + 1e-3f }, "south: lune on the left")
        // Mirror images of each other.
        north.zip(south).forEach { (n, s) ->
            assertEquals(100f, n.first + s.first, 1e-3f)
            assertEquals(n.second, s.second, 1e-3f)
        }
    }

    @Test
    fun `the outline runs pole to pole along the limb, then back up the terminator`() {
        val gibbous = WidgetMoon.Phase(0.35, (1 - kotlin.math.cos(2 * Math.PI * 0.35)) / 2, true)
        val points = assertNotNull(WidgetMoon.luneOutline(gibbous, false))
        val (top, bottom) = points.first() to points[points.size / 2 - 1]
        assertTrue(abs(top.second) < 1e-3f && abs(bottom.second - 100f) < 1e-3f)
        // A gibbous terminator bulges away from the lit side (into the left half).
        assertTrue(points.drop(points.size / 2).any { it.first < 50f })
    }
}

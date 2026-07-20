package com.minded.minded.overlay

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InteractionArrivalTargetTest {

    @Test
    fun `parses the measured web sun target returned by evaluateJavascript`() {
        val target = parseArrivalSunTarget(
            """{"centerXFraction":0.5,"centerYFraction":0.72,"widthFraction":0.22}"""
        )

        assertEquals(
            ArrivalSunTarget(
                centerXFraction = 0.5f,
                centerYFraction = 0.72f,
                widthFraction = 0.22f,
            ),
            target,
        )
    }

    @Test
    fun `parses a JSON-string result returned by evaluateJavascript`() {
        val target = parseArrivalSunTarget(
            """"{\"centerXFraction\":0.5,\"centerYFraction\":0.68,\"widthFraction\":0.2}""""
        )

        assertEquals(0.68f, target?.centerYFraction)
    }

    @Test
    fun `rejects missing or off-screen web sun measurements`() {
        assertNull(parseArrivalSunTarget("null"))
        assertNull(
            parseArrivalSunTarget(
                """{"centerXFraction":0.5,"centerYFraction":1.2,"widthFraction":0.22}"""
            )
        )
        assertNull(
            parseArrivalSunTarget(
                """{"centerXFraction":0.5,"centerYFraction":0.7,"widthFraction":0}"""
            )
        )
    }

    @Test
    fun `requires two close consecutive measurements before accepting a target`() {
        val first = ArrivalSunTarget(
            centerXFraction = 0.5f,
            centerYFraction = 0.7f,
            widthFraction = 0.2f,
        )
        val settled = first.copy(centerYFraction = 0.702f)

        val afterFirst = advanceArrivalSunTargetStability(
            ArrivalSunTargetStability(),
            first,
        )
        val afterSecond = advanceArrivalSunTargetStability(afterFirst, settled)

        assertFalse(afterFirst.isStable)
        assertTrue(afterSecond.isStable)
        assertEquals(settled, afterSecond.target)
    }

    @Test
    fun `layout shifts and invalid samples restart the consecutive measurement count`() {
        val initial = ArrivalSunTarget(
            centerXFraction = 0.5f,
            centerYFraction = 0.7f,
            widthFraction = 0.2f,
        )
        val shifted = initial.copy(centerYFraction = 0.76f)

        val afterInitial = advanceArrivalSunTargetStability(
            ArrivalSunTargetStability(),
            initial,
        )
        val afterShift = advanceArrivalSunTargetStability(afterInitial, shifted)
        val afterInvalid = advanceArrivalSunTargetStability(afterShift, null)

        assertFalse(afterShift.isStable)
        assertEquals(1, afterShift.consecutiveMeasurements)
        assertEquals(shifted, afterShift.target)
        assertEquals(ArrivalSunTargetStability(), afterInvalid)
    }

    @Test
    fun `dismisses instead of revealing an unready web view after the arrival timeout`() {
        assertTrue(shouldDismissFreshArrivalAfterTimeout(null))
        assertFalse(
            shouldDismissFreshArrivalAfterTimeout(
                ArrivalSunTarget(
                    centerXFraction = 0.5f,
                    centerYFraction = 0.7f,
                    widthFraction = 0.2f,
                )
            )
        )
    }

    @Test
    fun `native fresh-arrival sun remains an escape until the web handoff`() {
        assertTrue(
            shouldEnableFreshArrivalSunEscape(
                isCornerArrival = false,
                isFreshPlaceholderVisible = true,
            )
        )
        assertFalse(
            shouldEnableFreshArrivalSunEscape(
                isCornerArrival = true,
                isFreshPlaceholderVisible = true,
            )
        )
        assertFalse(
            shouldEnableFreshArrivalSunEscape(
                isCornerArrival = false,
                isFreshPlaceholderVisible = false,
            )
        )
        assertFalse(
            shouldEnableFreshArrivalSunEscape(
                isCornerArrival = false,
                isFreshPlaceholderVisible = true,
                escapeStep = FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN,
            )
        )
    }

    @Test
    fun `fresh escape morphs to the Little Sun target before revealing the Little Sun`() {
        assertEquals(
            FreshArrivalEscapeStep.NONE,
            resolveFreshArrivalEscapeStep(
                escapeRequested = false,
                hasReachedLittleSunTarget = false,
            ),
        )
        assertEquals(
            FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN,
            resolveFreshArrivalEscapeStep(
                escapeRequested = true,
                hasReachedLittleSunTarget = false,
            ),
        )
        assertEquals(
            FreshArrivalEscapeStep.SHOW_LITTLE_SUN,
            resolveFreshArrivalEscapeStep(
                escapeRequested = true,
                hasReachedLittleSunTarget = true,
            ),
        )
    }

    @Test
    fun `skip requests post to main before touching overlay and WebView state`() {
        assertTrue(shouldPostSkipInteractionToMainThread(isMainThread = false))
        assertFalse(shouldPostSkipInteractionToMainThread(isMainThread = true))
    }

    @Test
    fun `fresh escape handoff waits for actual animation completion`() {
        assertFalse(
            shouldCompleteFreshEscapeHandoff(
                step = FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN,
                placeholderVisible = true,
                animationRunning = true,
                windowAvailable = true,
            )
        )
        assertTrue(
            shouldCompleteFreshEscapeHandoff(
                step = FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN,
                placeholderVisible = true,
                animationRunning = false,
                windowAvailable = true,
            )
        )
    }

    @Test
    fun `fresh escape handoff requires a live non-hiding window`() {
        assertFalse(
            shouldCompleteFreshEscapeHandoff(
                step = FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN,
                placeholderVisible = true,
                animationRunning = false,
                windowAvailable = false,
            )
        )
        assertTrue(
            shouldCompleteFreshEscapeHandoff(
                step = FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN,
                placeholderVisible = true,
                animationRunning = false,
                windowAvailable = true,
            )
        )
    }
}

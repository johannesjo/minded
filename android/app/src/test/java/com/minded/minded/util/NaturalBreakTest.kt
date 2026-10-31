package com.minded.minded.util

import org.junit.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class NaturalBreakTest {

    private val app = "com.example.feed"
    private val since = 1_800_000_000_000L
    private val feed = "com.example.MainActivity"

    private fun isBreak(
        signal: NaturalBreakSignal,
        eventPackage: String = app,
        eventScreen: String? = null,
        startScreen: String? = feed,
        nowMs: Long = since + 1_000L,
    ) = isNaturalBreak(signal, eventPackage, eventScreen, app, startScreen, since, nowMs)

    @Test
    fun `moving to another screen in the app is a break`() {
        assertTrue(
            isBreak(NaturalBreakSignal.SCREEN_CHANGED, eventScreen = "com.example.PostActivity")
        )
    }

    @Test
    fun `the same screen again is not a break`() {
        assertFalse(isBreak(NaturalBreakSignal.SCREEN_CHANGED, eventScreen = feed))
    }

    @Test
    fun `a first screen seen with no start to compare against is not a break`() {
        assertFalse(
            isBreak(
                NaturalBreakSignal.SCREEN_CHANGED,
                eventScreen = "com.example.PostActivity",
                startScreen = null,
            )
        )
    }

    @Test
    fun `a toast is not a screen`() {
        assertFalse(
            isBreak(NaturalBreakSignal.SCREEN_CHANGED, eventScreen = "android.widget.Toast\$TN")
        )
        assertFalse(isScreen("android.widget.Toast"))
        assertFalse(isScreen(""))
        assertFalse(isScreen(null))
        assertTrue(isScreen(feed))
    }

    @Test
    fun `scrolling lets the user read for a while first`() {
        assertFalse(
            isBreak(
                NaturalBreakSignal.SCROLL,
                nowMs = since + NATURAL_BREAK_SCROLL_FALLBACK_MS - 1,
            )
        )
        assertTrue(
            isBreak(NaturalBreakSignal.SCROLL, nowMs = since + NATURAL_BREAK_SCROLL_FALLBACK_MS)
        )
    }

    @Test
    fun `only the app the sun rests over counts`() {
        assertFalse(
            isBreak(
                NaturalBreakSignal.SCREEN_CHANGED,
                eventPackage = "com.other.app",
                eventScreen = "com.other.Activity",
            )
        )
        assertFalse(
            isBreak(
                NaturalBreakSignal.SCROLL,
                eventPackage = "com.other.app",
                nowMs = since + NATURAL_BREAK_SCROLL_FALLBACK_MS,
            )
        )
    }

    @Test
    fun `a carousel sliding sideways is not the user scrolling`() {
        assertTrue(isSidewaysOnlyScroll(deltaX = 320, deltaY = 0))
        assertFalse(isSidewaysOnlyScroll(deltaX = 0, deltaY = 240))
        assertFalse(isSidewaysOnlyScroll(deltaX = 12, deltaY = 240))
        // Many lists report no (or unset) deltas - an unknown direction counts.
        assertFalse(isSidewaysOnlyScroll(deltaX = 0, deltaY = 0))
        assertFalse(isSidewaysOnlyScroll(deltaX = -1, deltaY = -1))
    }
}

package com.minded.minded.util

import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
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
    fun `a sheet, dialog, popup or framework container opening is not a new screen`() {
        assertFalse(isScreen("com.google.android.material.bottomsheet.BottomSheetDialog"))
        assertFalse(isScreen("androidx.appcompat.app.AlertDialog"))
        assertFalse(isScreen("android.widget.PopupWindow\$PopupDecorView"))
        assertFalse(isScreen("android.widget.FrameLayout"))
        assertFalse(isScreen("android.view.ViewGroup"))
        assertTrue(isScreen("com.instagram.mainactivity.MainActivity"))
    }

    @Test
    fun `a text field scrolling as it is typed is not the user scrolling`() {
        assertFalse(isUserScroll(0, 40, "android.widget.EditText", isEditable = false))
        assertFalse(isUserScroll(0, 40, "androidx.recyclerview.widget.RecyclerView", isEditable = true))
        assertTrue(isUserScroll(0, 40, "androidx.recyclerview.widget.RecyclerView", isEditable = false))
        assertFalse(isUserScroll(320, 0, "androidx.viewpager2.widget.ViewPager2", isEditable = false))
    }

    @Test
    fun `a wait ends without a break at the ceiling or when nothing can watch`() {
        assertFalse(shouldEndWaitWithoutBreak(since, since + NATURAL_BREAK_MAX_WAIT_MS - 1, canWatch = true))
        assertTrue(shouldEndWaitWithoutBreak(since, since + NATURAL_BREAK_MAX_WAIT_MS, canWatch = true))
        assertTrue(shouldEndWaitWithoutBreak(since, since + 1_000L, canWatch = false))
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

    // ==================== The gate ====================

    private val listening = mutableListOf<Boolean>()
    private val breaks = mutableListOf<String>()
    private val blocked = setOf(app, "com.example.other")

    @Before
    fun setUpGate() {
        NaturalBreakGate.resetForTest()
        NaturalBreakGate.post = { it() }
        NaturalBreakGate.onListeningChanged = { listening.add(it) }
    }

    @After
    fun tearDownGate() {
        NaturalBreakGate.resetForTest()
    }

    private fun await(nowMs: Long = since) =
        NaturalBreakGate.await(app, nowMs, isBlocked = { it in blocked }) { breaks.add(it) }

    @Test
    fun `the gate listens for scrolls only while waiting, and fires once`() {
        NaturalBreakGate.onScreen(app, feed, since)
        await()
        assertEquals(listOf(true), listening)

        NaturalBreakGate.onScreen(app, "com.example.PostActivity", since + 1_000L)
        NaturalBreakGate.onScreen(app, "com.example.ProfileActivity", since + 2_000L)
        assertEquals(listOf(app), breaks)
        assertEquals(listOf(true, false), listening)
        assertFalse(NaturalBreakGate.isWaiting())
    }

    @Test
    fun `other packages' windows never overwrite the screen the app is on`() {
        NaturalBreakGate.onScreen(app, feed, since)
        // minded's own pause window, then the keyboard
        NaturalBreakGate.onScreen("com.minded.minded", "com.minded.minded.MainActivity", since)
        NaturalBreakGate.onScreen("com.google.android.inputmethod.latin", "com.android.Keyboard", since)
        await()

        NaturalBreakGate.onScreen(app, "com.example.PostActivity", since + 1_000L)
        assertEquals(listOf(app), breaks)
    }

    @Test
    fun `a wait begun with no screen seen yet starts from the first one`() {
        await()
        NaturalBreakGate.onScreen(app, feed, since + 1_000L)
        assertTrue(breaks.isEmpty())

        NaturalBreakGate.onScreen(app, "com.example.PostActivity", since + 2_000L)
        assertEquals(listOf(app), breaks)
    }

    @Test
    fun `switching straight to another blocked app is a break for that app`() {
        await()
        NaturalBreakGate.onScreen("com.whatsapp", "com.whatsapp.Main", since + 1_000L)
        assertTrue(breaks.isEmpty())

        NaturalBreakGate.onScreen("com.example.other", "android.widget.FrameLayout", since + 2_000L)
        assertEquals(listOf("com.example.other"), breaks)
    }

    @Test
    fun `a scroll is a break only after the fallback`() {
        await()
        NaturalBreakGate.onScroll(app, since + 1_000L)
        assertTrue(breaks.isEmpty())

        NaturalBreakGate.onScroll(app, since + NATURAL_BREAK_SCROLL_FALLBACK_MS)
        assertEquals(listOf(app), breaks)
    }

    @Test
    fun `a cancelled wait never fires and stops listening`() {
        await()
        NaturalBreakGate.cancel()
        NaturalBreakGate.onScroll(app, since + NATURAL_BREAK_SCROLL_FALLBACK_MS)
        NaturalBreakGate.onScreen(app, "com.example.PostActivity", since + 1_000L)

        assertTrue(breaks.isEmpty())
        assertEquals(listOf(true, false), listening)
    }
}

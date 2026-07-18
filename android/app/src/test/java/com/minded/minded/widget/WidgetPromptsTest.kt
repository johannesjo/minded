package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WidgetPromptsTest {

    // Any real epoch day works; the value is arbitrary but fixed for determinism.
    private val day = 20_642L

    @Test
    fun `waking hours draw from the waking pool`() {
        // The app's light window (06:00–19:00), edges included, draws from the one
        // widget-safe pool.
        for (hour in intArrayOf(6, 9, 12, 16, 18)) {
            val prompt = WidgetPrompts.promptForMoment(day, hour, 0)
            assertTrue(prompt in WidgetPrompts.WAKING_PROMPTS, "hour $hour: $prompt")
        }
    }

    @Test
    fun `night shows no words - the moon carries the card alone`() {
        // Night is the app's 19:00–06:00, so the evening hours (19, 20) that used
        // to carry a line are now wordless with the moon.
        for (hour in intArrayOf(19, 20, 21, 23, 0, 4, 5)) {
            assertNull(WidgetPrompts.promptForMoment(day, hour, 0), "hour $hour")
        }
    }

    @Test
    fun `text exists exactly when the sky is light`() {
        // The near-black prompt text is only legible on the day sky. The slot
        // boundaries are built from SunWidgetPhase's constants so this holds by
        // construction - this guards the construction (e.g. someone reintroducing
        // a local night constant).
        for (hour in 0..23) {
            assertEquals(
                SunWidgetPhase.forHour(hour) == SunWidgetPhase.DAY,
                WidgetPrompts.promptForMoment(day, hour, 0) != null,
                "hour $hour",
            )
        }
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(
            WidgetPrompts.promptForMoment(day, 9, 0),
            WidgetPrompts.promptForMoment(day, 33, 0),
        )
        assertNull(WidgetPrompts.promptForMoment(day, -1, 0))
    }

    @Test
    fun `the line holds across its 15-minute slot, then steps at the edge`() {
        // Deterministic within a slot: Glance recompositions on launcher events
        // must never visibly shuffle the text mid-slot. It steps only at the edge,
        // so a return a slot or more later tends to find a fresh line.
        val slot = WidgetPrompts.promptForMoment(day, 10, 0)
        assertEquals(slot, WidgetPrompts.promptForMoment(day, 10, 7))
        assertEquals(slot, WidgetPrompts.promptForMoment(day, 10, 14))
        assertNotEquals(slot, WidgetPrompts.promptForMoment(day, 10, 15))
    }

    @Test
    fun `the line steps one per slot and walks the whole pool`() {
        // One step per 15-minute slot, no adjacent repeats: WAKING_PROMPTS.size
        // consecutive slots (from 06:00, ~3¾ h, all inside the day window) show
        // every line exactly once. This replaced a per-day char-sum seed that
        // skipped entries and repeated across X9→X0 date rollovers.
        val n = WidgetPrompts.WAKING_PROMPTS.size
        val lines = (0 until n).map { i ->
            val min = SunWidgetPhase.DAY_START * 60 + i * WidgetPrompts.SLOT_MINUTES
            WidgetPrompts.promptForMoment(day, min / 60, min % 60)
        }
        assertEquals(n, lines.distinct().size)
        lines.zipWithNext { a, b -> assertNotEquals(a, b, "adjacent slots repeat") }
    }

    @Test
    fun `a fixed time of day walks the whole pool across days`() {
        // The bug this guards: with a plain slot count the daily advance was
        // 96 % size, which shared a factor of 3 with a 15-line pool, so a glance
        // at the same time each day only ever surfaced 5 of 15 lines. DAILY_STRIDE
        // (97, prime) is coprime with the pool size, so consecutive days at a
        // fixed clock time cover every line. Sample one line per day for `size`
        // days at a fixed waking time.
        val n = WidgetPrompts.WAKING_PROMPTS.size
        val lines = (0 until n).map { d ->
            WidgetPrompts.promptForMoment(day + d, 9, 0)
        }
        assertEquals(n, lines.distinct().size, "a fixed time of day misses lines")
    }

    @Test
    fun `every line fits the card and says something`() {
        for (prompt in WidgetPrompts.WAKING_PROMPTS) {
            assertTrue(prompt.isNotBlank())
            assertTrue(
                prompt.length <= WidgetPrompts.MAX_PROMPT_LENGTH,
                "too long for the card (${prompt.length}): $prompt",
            )
        }
        assertTrue(WidgetPrompts.WAKING_PROMPTS.isNotEmpty())
    }

    @Test
    fun `isWidgetSafeLine allow-lists exactly the shown lines`() {
        // The deep link is validated against this, so only a line the widget
        // actually shows can reach the WebView location.
        assertTrue(WidgetPrompts.isWidgetSafeLine("Feel both feet on the floor."))
        assertTrue(WidgetPrompts.isWidgetSafeLine("How about a deep breath?"))
        // A widget-safe question is shown in its displayed form, "?" included.
        assertTrue(WidgetPrompts.isWidgetSafeLine("What is already enough about this moment?"))
        // A question NOT on the widget's curated list, and junk.
        assertFalse(WidgetPrompts.isWidgetSafeLine("What went well today?"))
        assertFalse(WidgetPrompts.isWidgetSafeLine(""))
        assertFalse(WidgetPrompts.isWidgetSafeLine("/?sun=open"))
    }

    @Test
    fun `by day the schedule steps to the next 15-minute slot`() {
        assertEquals(15, WidgetPrompts.minutesUntilNextChange(9, 0))
        assertEquals(8, WidgetPrompts.minutesUntilNextChange(9, 7))
        assertEquals(1, WidgetPrompts.minutesUntilNextChange(9, 14))
        // The last day slot steps onto night (the moon) at 19:00.
        assertEquals(10, WidgetPrompts.minutesUntilNextChange(18, 50))
    }

    @Test
    fun `across the night a single alarm spans to the first line of day`() {
        // 05:30 -> first line at day-start 06:00.
        assertEquals(30, WidgetPrompts.minutesUntilNextChange(5, 30))
        // 22:00 -> day-start 06:00 next day = 8 hours.
        assertEquals(8 * 60, WidgetPrompts.minutesUntilNextChange(22, 0))
        // 19:00 (night start) -> day-start 06:00 next day = 11 hours.
        assertEquals(11 * 60, WidgetPrompts.minutesUntilNextChange(19, 0))
    }

    @Test
    fun `landing exactly on a slot edge schedules the next one, never zero`() {
        // On a quarter-hour by day -> the following slot, 15 minutes out.
        assertEquals(15, WidgetPrompts.minutesUntilNextChange(6, 0))
        assertEquals(15, WidgetPrompts.minutesUntilNextChange(10, 30))
    }
}

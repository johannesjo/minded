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
        // The whole light window, including the former evening hour (20), now
        // draws from the one widget-safe pool.
        for (hour in intArrayOf(5, 9, 12, 16, 19, 20)) {
            val prompt = WidgetPrompts.promptForMoment(day, hour)
            assertTrue(prompt in WidgetPrompts.WAKING_PROMPTS, "hour $hour: $prompt")
        }
    }

    @Test
    fun `night shows no words - the moon carries the card alone`() {
        for (hour in intArrayOf(21, 23, 0, 3, 4)) {
            assertNull(WidgetPrompts.promptForMoment(day, hour), "hour $hour")
        }
    }

    @Test
    fun `text exists exactly when the sky is light`() {
        // The near-black prompt text is only legible on the day sky. The slot
        // boundaries are built from SunWidgetPhase's constants so this holds by
        // construction — this guards the construction (e.g. someone reintroducing
        // a local night constant).
        for (hour in 0..23) {
            assertEquals(
                SunWidgetPhase.forHour(hour) == SunWidgetPhase.DAY,
                WidgetPrompts.promptForMoment(day, hour) != null,
                "hour $hour",
            )
        }
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(
            WidgetPrompts.promptForMoment(day, 9),
            WidgetPrompts.promptForMoment(day, 33),
        )
        assertNull(WidgetPrompts.promptForMoment(day, -1))
    }

    @Test
    fun `the same moment always shows the same line, across the whole slot`() {
        // Deterministic by construction: Glance recompositions on launcher events
        // must never visibly shuffle the text, and there is nothing to "refresh".
        // Stable across the entire light window now — including the former evening
        // hour (20), which used to swap to a different pool.
        val first = WidgetPrompts.promptForMoment(day, 5)
        assertEquals(first, WidgetPrompts.promptForMoment(day, 10))
        assertEquals(first, WidgetPrompts.promptForMoment(day, 19))
        assertEquals(first, WidgetPrompts.promptForMoment(day, 20))
    }

    @Test
    fun `the line walks the whole pool, one step per day`() {
        // Epoch-day indexing: every entry appears once per pool-length cycle and
        // adjacent days never repeat (the char-sum seed this replaced skipped
        // entries and repeated across X9-X0 date rollovers).
        val lines = (0 until WidgetPrompts.WAKING_PROMPTS.size)
            .map { WidgetPrompts.promptForMoment(day + it, 10) }
        assertEquals(WidgetPrompts.WAKING_PROMPTS.size, lines.distinct().size)

        assertNotEquals(
            WidgetPrompts.promptForMoment(day, 10),
            WidgetPrompts.promptForMoment(day + 1, 10),
        )
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
        // A gratitude line (no longer shown, no widget-safe interaction) and junk.
        assertFalse(WidgetPrompts.isWidgetSafeLine("What went well today?"))
        assertFalse(WidgetPrompts.isWidgetSafeLine(""))
        assertFalse(WidgetPrompts.isWidgetSafeLine("/?sun=open"))
    }

    @Test
    fun `minutes until next change counts toward the upcoming slot`() {
        // 04:30 -> day slot at 05:00.
        assertEquals(30, WidgetPrompts.minutesUntilNextChange(4, 30))
        // 09:00 -> night at 21:00 is 12h away (the line is stable all day now).
        assertEquals(12 * 60, WidgetPrompts.minutesUntilNextChange(9, 0))
        // 20:15 -> night at 21:00 is 45 minutes away.
        assertEquals(45, WidgetPrompts.minutesUntilNextChange(20, 15))
        // 22:00 -> day at 05:00 next day = 7 hours.
        assertEquals(7 * 60, WidgetPrompts.minutesUntilNextChange(22, 0))
    }

    @Test
    fun `landing exactly on a boundary schedules the next one, never zero`() {
        // 05:00 (day start) -> next change is night at 21:00 (16h).
        assertEquals(16 * 60, WidgetPrompts.minutesUntilNextChange(5, 0))
        // 21:00 (night start) -> next change is day-start 05:00 next day (8h).
        assertEquals(8 * 60, WidgetPrompts.minutesUntilNextChange(21, 0))
    }

}

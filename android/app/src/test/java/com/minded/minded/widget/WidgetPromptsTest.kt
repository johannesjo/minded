package com.minded.minded.widget

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WidgetPromptsTest {

    @Test
    fun `day hours draw from the day pool`() {
        for (hour in intArrayOf(5, 9, 12, 16, 19)) {
            val prompt = WidgetPrompts.promptForMoment("2026-07-07", hour)
            assertTrue(prompt in WidgetPrompts.DAY_PROMPTS, "hour $hour: $prompt")
        }
    }

    @Test
    fun `the evening hour draws from the evening pool`() {
        val prompt = WidgetPrompts.promptForMoment("2026-07-07", 20)
        assertTrue(prompt in WidgetPrompts.EVENING_PROMPTS)
    }

    @Test
    fun `night shows no words - the moon carries the card alone`() {
        for (hour in intArrayOf(21, 23, 0, 3, 4)) {
            assertNull(WidgetPrompts.promptForMoment("2026-07-07", hour), "hour $hour")
        }
    }

    @Test
    fun `out of range hours wrap around the clock`() {
        assertEquals(
            WidgetPrompts.promptForMoment("2026-07-07", 9),
            WidgetPrompts.promptForMoment("2026-07-07", 33),
        )
        assertNull(WidgetPrompts.promptForMoment("2026-07-07", -1))
    }

    @Test
    fun `the same moment always shows the same line`() {
        // Deterministic by construction: Glance recompositions on launcher events
        // must never visibly shuffle the text, and there is nothing to "refresh".
        val first = WidgetPrompts.promptForMoment("2026-07-07", 10)
        repeat(10) {
            assertEquals(first, WidgetPrompts.promptForMoment("2026-07-07", 10))
        }
        // Stable across the whole day slot, not just the hour.
        assertEquals(first, WidgetPrompts.promptForMoment("2026-07-07", 19))
    }

    @Test
    fun `the line rotates across days`() {
        val prompts = (1..14)
            .map { day -> WidgetPrompts.promptForMoment("2026-07-%02d".format(day), 10) }
        assertTrue(prompts.distinct().size > 1, "two weeks showed a single line: $prompts")
    }

    @Test
    fun `every line fits the card and says something`() {
        for (prompt in WidgetPrompts.DAY_PROMPTS + WidgetPrompts.EVENING_PROMPTS) {
            assertTrue(prompt.isNotBlank())
            assertTrue(
                prompt.length <= WidgetPrompts.MAX_PROMPT_LENGTH,
                "too long for the card (${prompt.length}): $prompt",
            )
        }
        assertTrue(WidgetPrompts.DAY_PROMPTS.isNotEmpty())
        assertTrue(WidgetPrompts.EVENING_PROMPTS.isNotEmpty())
    }

    @Test
    fun `minutes until next change counts toward the upcoming slot`() {
        // 04:30 -> day slot at 05:00.
        assertEquals(30, WidgetPrompts.minutesUntilNextChange(4, 30))
        // 09:00 -> evening slot at 20:00 is 11h away.
        assertEquals(11 * 60, WidgetPrompts.minutesUntilNextChange(9, 0))
        // 20:15 -> night at 21:00 is 45 minutes away.
        assertEquals(45, WidgetPrompts.minutesUntilNextChange(20, 15))
        // 22:00 -> day at 05:00 next day = 7 hours.
        assertEquals(7 * 60, WidgetPrompts.minutesUntilNextChange(22, 0))
    }

    @Test
    fun `landing exactly on a boundary schedules the next one, never zero`() {
        assertEquals(15 * 60, WidgetPrompts.minutesUntilNextChange(5, 0))
        assertEquals(60, WidgetPrompts.minutesUntilNextChange(20, 0))
    }

    @Test
    fun `prompt boundaries cover the sun phase boundaries`() {
        // The receiver arms one alarm off the earlier of the two schedules; the
        // prompt slots (5/20/21) contain the phase flips (5/21), so a prompt-only
        // regression here would also strand the sun - guard the containment.
        for (hour in 0..23) {
            assertTrue(
                WidgetPrompts.minutesUntilNextChange(hour, 0) <=
                    SunWidgetPhase.minutesUntilNextBoundary(hour, 0),
                "hour $hour",
            )
        }
    }
}

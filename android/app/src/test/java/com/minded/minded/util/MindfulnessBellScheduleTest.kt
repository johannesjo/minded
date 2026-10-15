package com.minded.minded.util

import com.minded.minded.util.MindfulnessBellSchedule.EARLIEST_SLOT_MINUTE
import com.minded.minded.util.MindfulnessBellSchedule.LATEST_RING_MINUTE
import com.minded.minded.util.MindfulnessBellSchedule.LATEST_SLOT_MINUTE
import com.minded.minded.util.MindfulnessBellSchedule.MIN_RING_GAP_MINUTES
import com.minded.minded.util.MindfulnessBellSchedule.MIN_SLOT_GAP_MINUTES
import com.minded.minded.util.MindfulnessBellSchedule.SLOTS_PER_DAY_RANGE
import com.minded.minded.util.MindfulnessBellSchedule.SLOT_FIRE_WINDOW_MINUTES
import com.minded.minded.util.MindfulnessBellSchedule.dueSlot
import com.minded.minded.util.MindfulnessBellSchedule.slotsFor
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MindfulnessBellScheduleTest {

    @Test
    fun `every day's slots stay in waking hours and keep their gap`() {
        for (count in SLOTS_PER_DAY_RANGE) for (day in 0L until 2000L) {
            val slots = slotsFor(day, salt = 42L, count = count)
            assertEquals(count, slots.size)
            assertEquals(slots.sorted(), slots)
            slots.forEach { assertTrue(it in EARLIEST_SLOT_MINUTE..LATEST_SLOT_MINUTE, "day $day: $it") }
            slots.zipWithNext().forEach { (a, b) ->
                assertTrue(b - a >= MIN_SLOT_GAP_MINUTES, "day $day: $slots")
            }
        }
    }

    @Test
    fun `a count outside the choices is held to them`() {
        assertEquals(1, slotsFor(19_000L, 7L, count = 0).size)
        assertEquals(3, slotsFor(19_000L, 7L, count = 9).size)
    }

    @Test
    fun `the same day always has the same slots - a restart never re-rolls them`() {
        assertEquals(slotsFor(19_000L, 7L), slotsFor(19_000L, 7L))
    }

    @Test
    fun `slots are not a clock - they move from day to day and between installs`() {
        val week = (0L until 7L).map { slotsFor(19_000L + it, 7L) }
        assertTrue(week.toSet().size > 1)
        assertNotEquals(slotsFor(19_000L, 7L), slotsFor(19_000L, 8L))
    }

    @Test
    fun `an unlock rings for a slot only within its window after it`() {
        val slots = listOf(10 * 60, 15 * 60)
        assertNull(dueSlot(10 * 60 - 1, slots, 0, null))
        assertEquals(0, dueSlot(10 * 60, slots, 0, null))
        assertEquals(0, dueSlot(10 * 60 + SLOT_FIRE_WINDOW_MINUTES - 1, slots, 0, null))
        // Missed window: dropped, no catch-up.
        assertNull(dueSlot(10 * 60 + SLOT_FIRE_WINDOW_MINUTES, slots, 0, null))
        assertEquals(1, dueSlot(15 * 60 + 5, slots, 0, null))
    }

    @Test
    fun `a slot that has rung never rings again`() {
        val slots = listOf(10 * 60, 15 * 60)
        assertNull(dueSlot(10 * 60 + 30, slots, rungMask = 0b01, lastRungMinute = 10 * 60))
        assertNull(dueSlot(15 * 60 + 30, slots, rungMask = 0b11, lastRungMinute = 15 * 60))
    }

    @Test
    fun `two rings are never close together`() {
        // A late first ring and an early second slot: the second waits.
        val slots = listOf(10 * 60, 13 * 60)
        val firstRing = 11 * 60 + 50
        assertNull(dueSlot(13 * 60, slots, 0b01, lastRungMinute = firstRing))
        assertEquals(
            1,
            dueSlot(firstRing + MIN_RING_GAP_MINUTES, slots, 0b01, lastRungMinute = firstRing),
        )
    }

    @Test
    fun `nothing rings late in the evening`() {
        val slots = listOf(LATEST_SLOT_MINUTE - 200, LATEST_SLOT_MINUTE)
        assertEquals(1, dueSlot(LATEST_RING_MINUTE - 1, slots, 0b01, null))
        assertNull(dueSlot(LATEST_RING_MINUTE, slots, 0b01, null))
    }

    private fun voice(
        soundEnabled: Boolean = true,
        ringer: String = "normal",
        mediaVolume: Int = 7,
    ) = bellVoice(soundEnabled, ringer == "normal", ringer == "vibrate", mediaVolume)

    @Test
    fun `the strike is heard only when the phone may make a sound`() {
        assertEquals(BellVoice.SOUND, voice())
        assertEquals(BellVoice.SILENT, voice(mediaVolume = 0))
        assertEquals(BellVoice.SILENT, voice(soundEnabled = false))
    }

    @Test
    fun `a silenced phone never rings out loud`() {
        assertEquals(BellVoice.VIBRATION, voice(ringer = "vibrate"))
        assertEquals(BellVoice.SILENT, voice(ringer = "silent"))
        assertEquals(BellVoice.SILENT, voice(ringer = "silent", soundEnabled = true, mediaVolume = 15))
    }
}

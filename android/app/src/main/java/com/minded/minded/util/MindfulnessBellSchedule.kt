package com.minded.minded.util

import kotlin.random.Random

/**
 * When the mindfulness bell may ring (#298) - pure, so it is unit-testable.
 *
 * The bell is the classic "bell of mindfulness": rarely, at a moment the user
 * can't anticipate, the sun rings over whatever they are doing. Randomness is
 * the practice - a bell at fixed times becomes a clock and is anticipated
 * within a week - but it is random *within structure*, never dice all day:
 *
 * - Each day has the user's chosen number of slots ([SLOTS_PER_DAY_RANGE],
 *   [DEFAULT_SLOTS_PER_DAY] unless set), drawn at random across the whole
 *   day ([EARLIEST_SLOT_MINUTE]..[LATEST_SLOT_MINUTE]) and at least
 *   [minSlotGapFor] apart ([MIN_SLOT_GAP_MINUTES] for up to three). The draw is a pure function of the day and a
 *   per-install salt, so the same day always has the same slots (no re-roll on
 *   a service restart) while two installs never share them.
 * - A slot doesn't fire at its time - nothing wakes the phone. It rings at the
 *   first unlock *after* it, if that unlock comes within [fireWindowFor]
 *   ([SLOT_FIRE_WINDOW_MINUTES] for up to three). Otherwise it is dropped, with no catch-up. The
 *   bell meets the moment the phone is picked up, never pulls anyone out of a
 *   pocket, and adapts by itself: a light phone user simply hears it less.
 *   That is how "a few times a day" happens without a counter.
 * - Never two rings within [minRingGapFor] ([MIN_RING_GAP_MINUTES] for up
 *   to three), even if a late first slot and an early second one would allow it.
 * - No waking-hours cut-off: a slot at 3 a.m. simply passes unheard unless the
 *   phone is picked up then. The night is kept by the moment checks instead
 *   (Do Not Disturb, the bedtime wind-down - see MindfulnessBell.skipReason).
 *
 * Nothing about the user's response is recorded anywhere: which slots have
 * rung today is bookkeeping for "don't ring twice", forgotten the next day.
 */
object MindfulnessBellSchedule {
    const val DEFAULT_SLOTS_PER_DAY = 2
    // Wide for now so the bell can be tried out often; the everyday choices
    // are one to three.
    val SLOTS_PER_DAY_RANGE = 1..30
    const val EARLIEST_SLOT_MINUTE = 0
    const val LATEST_SLOT_MINUTE = 24 * 60 - 1
    const val MIN_SLOT_GAP_MINUTES = 3 * 60
    const val SLOT_FIRE_WINDOW_MINUTES = 2 * 60
    const val MIN_RING_GAP_MINUTES = 90

    /** Up to this many slots keep the full [MIN_SLOT_GAP_MINUTES]/[MIN_RING_GAP_MINUTES]. */
    private const val SPACIOUS_SLOTS = 3

    /**
     * How far apart a day of [count] slots must be. One to three keep the
     * full [MIN_SLOT_GAP_MINUTES]; more shrink it so they still fit, leaving
     * half the day free to land at random.
     */
    fun minSlotGapFor(count: Int): Int =
        if (count <= SPACIOUS_SLOTS) MIN_SLOT_GAP_MINUTES
        else (LATEST_SLOT_MINUTE - EARLIEST_SLOT_MINUTE) / (2 * (count - 1))

    /** The least time between two rings - [MIN_RING_GAP_MINUTES], or half the slot gap for many slots. */
    fun minRingGapFor(count: Int): Int =
        if (count <= SPACIOUS_SLOTS) MIN_RING_GAP_MINUTES else minSlotGapFor(count) / 2

    /**
     * How long after its time a slot may still ring - [SLOT_FIRE_WINDOW_MINUTES],
     * or the slot gap for many slots, so an old slot never rings late into the
     * next one's turn.
     */
    fun fireWindowFor(count: Int): Int =
        if (count <= SPACIOUS_SLOTS) SLOT_FIRE_WINDOW_MINUTES else minSlotGapFor(count)

    /**
     * The day's [count] slots as minutes of the local day, ascending. Drawn
     * uniformly over every set that keeps [minSlotGapFor] apart: draw the
     * points in the span with the gaps taken out, then put the gaps back.
     * Changing [count] re-rolls the day; the rung count and ring gap in
     * [dueSlot] still keep a re-roll from ringing extra or back to back.
     */
    fun slotsFor(epochDay: Long, salt: Long, count: Int = DEFAULT_SLOTS_PER_DAY): List<Int> {
        val n = count.coerceIn(SLOTS_PER_DAY_RANGE)
        val gap = minSlotGapFor(n)
        val free = LATEST_SLOT_MINUTE - EARLIEST_SLOT_MINUTE - (n - 1) * gap
        val random = Random(epochDay * 1_000_003L + salt)
        return List(n) { random.nextInt(0, free + 1) }
            .sorted()
            .mapIndexed { i, offset -> EARLIEST_SLOT_MINUTE + offset + i * gap }
    }

    /**
     * The slot an unlock at [minuteOfDay] should ring for, or null. [rungMask]
     * has bit i set once slot i has rung today; [lastRungMinute] is today's last
     * ring (null if none yet).
     */
    fun dueSlot(
        minuteOfDay: Int,
        slots: List<Int>,
        rungMask: Int,
        lastRungMinute: Int?,
    ): Int? {
        // The mask counts rings by slot index; a count changed mid-day re-rolls
        // the slots under it, so cap by how many have rung, not which.
        if (rungMask.countOneBits() >= slots.size) return null
        if (lastRungMinute != null && minuteOfDay - lastRungMinute < minRingGapFor(slots.size)) {
            return null
        }
        return slots.indices.firstOrNull { i ->
            rungMask and (1 shl i) == 0 &&
                minuteOfDay >= slots[i] &&
                minuteOfDay < slots[i] + fireWindowFor(slots.size)
        }
    }
}

/** How the bell's strike reaches the user - see [bellVoice]. */
enum class BellVoice { SOUND, VIBRATION, SILENT }

/**
 * How the strike is voiced, given the phone's state. The light is always the
 * bell; sound and touch only join it when the user's own settings say they
 * may. The silent and vibrate switches don't mute the media stream minded
 * plays on, so they are honoured explicitly here - a "silent" phone must never
 * ring out loud. (Under Do Not Disturb the bell doesn't come at all - see
 * MindfulnessBell.skipReason.)
 */
fun bellVoice(
    soundEnabled: Boolean,
    ringerNormal: Boolean,
    ringerVibrate: Boolean,
    mediaVolume: Int,
): BellVoice = when {
    ringerNormal && soundEnabled && mediaVolume > 0 -> BellVoice.SOUND
    ringerVibrate -> BellVoice.VIBRATION
    else -> BellVoice.SILENT
}

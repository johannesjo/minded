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
 * - Each day has [SLOTS_PER_DAY] slots, drawn at random within
 *   [EARLIEST_SLOT_MINUTE]..[LATEST_SLOT_MINUTE] and at least
 *   [MIN_SLOT_GAP_MINUTES] apart. The draw is a pure function of the day and a
 *   per-install salt, so the same day always has the same slots (no re-roll on
 *   a service restart) while two installs never share them.
 * - A slot doesn't fire at its time - nothing wakes the phone. It rings at the
 *   first unlock *after* it, if that unlock comes within
 *   [SLOT_FIRE_WINDOW_MINUTES]. Otherwise it is dropped, with no catch-up. The
 *   bell meets the moment the phone is picked up, never pulls anyone out of a
 *   pocket, and adapts by itself: a light phone user simply hears it less.
 *   That is how "once or twice a day" happens without a counter.
 * - Never two rings within [MIN_RING_GAP_MINUTES], even if a late first slot
 *   and an early second one would allow it, and never at or after
 *   [LATEST_RING_MINUTE] - the same waking-hours end the in-intervention bell
 *   uses (ACTION_ADVICES_MAX_HOUR in actionAdvices.ts).
 *
 * Nothing about the user's response is recorded anywhere: which slots have
 * rung today is bookkeeping for "don't ring twice", forgotten the next day.
 */
object MindfulnessBellSchedule {
    const val SLOTS_PER_DAY = 2
    const val EARLIEST_SLOT_MINUTE = 9 * 60
    const val LATEST_SLOT_MINUTE = 20 * 60
    const val MIN_SLOT_GAP_MINUTES = 3 * 60
    const val SLOT_FIRE_WINDOW_MINUTES = 2 * 60
    const val MIN_RING_GAP_MINUTES = 90
    const val LATEST_RING_MINUTE = 22 * 60

    /**
     * The day's slots as minutes of the local day, ascending. Drawn uniformly
     * over every pair that keeps the minimum gap (rejection sampling - with
     * these bounds roughly two draws in five are kept, so the bounded loop
     * practically never reaches its evenly-spaced fallback).
     */
    fun slotsFor(epochDay: Long, salt: Long): List<Int> {
        val random = Random(epochDay * 1_000_003L + salt)
        repeat(64) {
            val slots = List(SLOTS_PER_DAY) {
                random.nextInt(EARLIEST_SLOT_MINUTE, LATEST_SLOT_MINUTE + 1)
            }.sorted()
            if (slots.zipWithNext().all { (a, b) -> b - a >= MIN_SLOT_GAP_MINUTES }) {
                return slots
            }
        }
        val span = LATEST_SLOT_MINUTE - EARLIEST_SLOT_MINUTE
        return List(SLOTS_PER_DAY) { i ->
            EARLIEST_SLOT_MINUTE + span * (i + 1) / (SLOTS_PER_DAY + 1)
        }
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
        if (minuteOfDay >= LATEST_RING_MINUTE) return null
        if (lastRungMinute != null && minuteOfDay - lastRungMinute < MIN_RING_GAP_MINUTES) {
            return null
        }
        return slots.indices.firstOrNull { i ->
            rungMask and (1 shl i) == 0 &&
                minuteOfDay >= slots[i] &&
                minuteOfDay < slots[i] + SLOT_FIRE_WINDOW_MINUTES
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
 * ring out loud - and Do Not Disturb (any filter but "all") silences both.
 */
fun bellVoice(
    soundEnabled: Boolean,
    ringerNormal: Boolean,
    ringerVibrate: Boolean,
    doNotDisturb: Boolean,
    mediaVolume: Int,
): BellVoice = when {
    doNotDisturb -> BellVoice.SILENT
    ringerNormal && soundEnabled && mediaVolume > 0 -> BellVoice.SOUND
    ringerVibrate -> BellVoice.VIBRATION
    else -> BellVoice.SILENT
}

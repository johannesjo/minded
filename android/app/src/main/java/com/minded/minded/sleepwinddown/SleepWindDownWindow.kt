package com.minded.minded.sleepwinddown

import com.minded.minded.util.UserCfg
import java.util.Calendar
import java.util.Date

private fun isoDate(d: Date): String {
    val c = Calendar.getInstance().apply { time = d }
    val y = c.get(Calendar.YEAR)
    val m = (c.get(Calendar.MONTH) + 1).toString().padStart(2, '0')
    val day = c.get(Calendar.DAY_OF_MONTH).toString().padStart(2, '0')
    return "$y-$m-$day"
}

/**
 * Time-window helpers for the sleep wind-down feature.
 *
 * Mirrors the TypeScript helpers in
 * extension/src/shared/components/sleepWindDown/sleepWindDown.util.ts
 * — both must agree on what counts as "inside the window" and on how a night
 * is identified across midnight.
 */
object SleepWindDownWindow {

    /**
     * Parse `HH:MM`. Returns null on any malformed input — callers must treat
     * null as "no window" rather than crashing or silently using a wrong value.
     */
    private fun parseHHMM(s: String): Int? {
        val m = Regex("""^(\d{1,2}):(\d{2})$""").matchEntire(s.trim()) ?: return null
        val h = m.groupValues[1].toIntOrNull() ?: return null
        val mm = m.groupValues[2].toIntOrNull() ?: return null
        if (h !in 0..23 || mm !in 0..59) return null
        return h * 60 + mm
    }

    /** Returns the parsed days map, or null if cfg is disabled / missing / malformed. */
    @Suppress("UNCHECKED_CAST")
    private fun daysMap(cfg: UserCfg): Map<String, Map<String, String>>? {
        val swd = cfg.sleepWindDown ?: return null
        val enabled = swd["enabled"] as? Boolean ?: false
        if (!enabled) return null
        val raw = swd["days"] as? Map<String, Any?> ?: return null
        val out = mutableMapOf<String, Map<String, String>>()
        raw.forEach { (k, v) ->
            val asMap = v as? Map<*, *> ?: return@forEach
            val start = asMap["start"] as? String ?: return@forEach
            val end = asMap["end"] as? String ?: return@forEach
            out[k] = mapOf("start" to start, "end" to end)
        }
        return out
    }

    /** Day index used to key the schedule, matching JS Date#getDay (0 = Sunday). */
    private fun dayIndex(date: Date): Int {
        val c = Calendar.getInstance().apply { time = date }
        // Calendar.SUNDAY = 1 .. Calendar.SATURDAY = 7
        return c.get(Calendar.DAY_OF_WEEK) - 1
    }

    private fun rangeFor(days: Map<String, Map<String, String>>, idx: Int): Pair<Int, Int>? {
        val r = days[idx.toString()] ?: return null
        val start = r["start"]?.let { parseHHMM(it) } ?: return null
        val end = r["end"]?.let { parseHHMM(it) } ?: return null
        if (start == end) return null
        return start to end
    }

    /**
     * Returns the night id (ISO date of bedtime's day) for the given moment, or null
     * if the moment is not inside any configured wind-down window.
     */
    fun resolveNightId(cfg: UserCfg, atMs: Long = System.currentTimeMillis()): String? {
        val days = daysMap(cfg) ?: return null
        val now = Date(atMs)
        val cal = Calendar.getInstance().apply { time = now }
        val minutesNow = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)

        rangeFor(days, dayIndex(now))?.let { (start, end) ->
            if (end > start) {
                if (minutesNow in start until end) return isoDate(now)
            } else {
                if (minutesNow >= start) return isoDate(now)
            }
        }

        val yesterday = Calendar.getInstance().apply {
            time = now
            add(Calendar.DATE, -1)
        }.time
        rangeFor(days, dayIndex(yesterday))?.let { (start, end) ->
            if (end < start && minutesNow < end) return isoDate(yesterday)
        }

        return null
    }
}

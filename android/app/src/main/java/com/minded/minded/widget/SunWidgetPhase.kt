package com.minded.minded.widget

/**
 * The time-of-day phase of the home-screen companion sun. The widget is a calm,
 * ambient anchor: glancing at it grounds you in where you actually are in the
 * day's natural rhythm of light — the sun by day, the moon by night. This is
 * present-moment by construction (it reflects the real local hour, never a stale
 * timestamp) and carries no metric, count, or judgment. See
 * docs/sun-companion-widget.md.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
enum class SunWidgetPhase {
    DAY, NIGHT;

    companion object {
        // Just two phases: the warm sun by day, the cool moon by night. We
        // deliberately do not split out dawn/dusk — their saturated, in-between
        // colours (amber/coral) read as an evaluative *signal* on a surface that
        // must never grade the user, and sun-vs-moon is the one shift everyone
        // reads as "the world", not "a message to me". Boundaries ascending on the
        // 24h clock; coarse on purpose — the sun does not tick.
        // `internal` (not private) because WidgetPrompts builds its slot
        // boundaries from these — the single definition is what guarantees the
        // card's no-text window is exactly the moon's window.
        internal const val DAY_START = 5    // the sun is up
        internal const val NIGHT_START = 21 // the moon

        private val BOUNDARY_HOURS = intArrayOf(DAY_START, NIGHT_START)

        /** The phase for a given local hour-of-day (0–23; other values wrap). */
        fun forHour(hour: Int): SunWidgetPhase =
            if (hour.mod(24) in DAY_START until NIGHT_START) DAY else NIGHT

        /**
         * Minutes from the given local time until the next phase change. Always
         * strictly positive, so landing exactly on a boundary schedules the
         * following one, not an immediate re-fire.
         */
        fun minutesUntilNextBoundary(hour: Int, minute: Int): Int =
            minutesUntilNext(BOUNDARY_HOURS, hour, minute)
    }
}

package com.minded.minded.widget

/**
 * The time-of-day phase of the home-screen companion sun. The widget is a calm,
 * ambient anchor: glancing at it grounds you in where you actually are in the
 * day's natural rhythm of light — dawn, midday, dusk, the moon at night. This is
 * present-moment by construction (it reflects the real local hour, never a stale
 * timestamp) and carries no metric, count, or judgment. See
 * docs/sun-companion-widget.md.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
enum class SunWidgetPhase {
    DAWN, DAY, DUSK, NIGHT;

    companion object {
        // Phase boundaries on the 24h clock, ascending. Coarse on purpose: the
        // sun shifts warmth a few times a day, it does not tick.
        private const val DAWN_START = 5   // first warm light
        private const val DAY_START = 9    // bright, high sun
        private const val DUSK_START = 17  // declining, golden sun
        private const val NIGHT_START = 21 // the moon

        private val BOUNDARY_HOURS = intArrayOf(DAWN_START, DAY_START, DUSK_START, NIGHT_START)

        /** The phase for a given local hour-of-day (0–23; other values wrap). */
        fun forHour(hour: Int): SunWidgetPhase {
            val h = ((hour % 24) + 24) % 24
            return when {
                h < DAWN_START -> NIGHT
                h < DAY_START -> DAWN
                h < DUSK_START -> DAY
                h < NIGHT_START -> DUSK
                else -> NIGHT
            }
        }

        /**
         * Minutes from the given local time until the next phase change. The
         * receiver uses this to arm a single, inexact alarm per phase (≈4 wakeups
         * a day) rather than polling. Always strictly positive, so landing exactly
         * on a boundary schedules the following one, not an immediate re-fire.
         */
        fun minutesUntilNextBoundary(hour: Int, minute: Int): Int {
            val nowMin = (((hour % 24) + 24) % 24) * 60 + (((minute % 60) + 60) % 60)
            for (boundaryHour in BOUNDARY_HOURS) {
                val boundaryMin = boundaryHour * 60
                if (boundaryMin > nowMin) return boundaryMin - nowMin
            }
            // Past the last boundary today: wrap to the first one tomorrow.
            return BOUNDARY_HOURS[0] * 60 + 24 * 60 - nowMin
        }
    }
}

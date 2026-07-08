package com.minded.minded.widget

/**
 * The card widget's sky for a local hour — the widget-shaped echo of the app's
 * living ambient sky (extension/src/shared/skyTimeline.ts). The app interpolates
 * its background through pastel keyframes per minute; a widget can't (it is baked
 * PNGs repainted by a handful of inexact alarms), so the card *steps* between
 * card-sized renders of those same keyframes on whole hours. All day skies are
 * light pastels by design (the saturated skies live in the app's drag reveals),
 * so the near-black prompt text stays legible on every one of them, and the
 * stepping stays "the world's light", never a signal graded at the user.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM;
 * the drawable mapping lives in MyAppWidget.
 */
enum class WidgetSky {
    DAWN, MORNING, MIDDAY, AFTERNOON, DUSK, NIGHT;

    companion object {
        // Whole-hour steps through AMBIENT_SKY_KEYFRAMES (hours 6/9/13/16.5/19):
        // dawn holds from the sun's own day start at 05 (the timeline clamps to
        // its edges the same way), 16.5 rounds to a 17:00 alarm, and dusk holds
        // 19–21 until the moon — the app hands night to the dark theme at 19,
        // but on the widget the clock (SunWidgetPhase) owns that boundary.
        private val BOUNDARY_HOURS = intArrayOf(
            SunWidgetPhase.DAY_START, 9, 13, 17, 19, SunWidgetPhase.NIGHT_START,
        )

        /** The sky for a given local hour-of-day (0–23; other values wrap). */
        fun forHour(hour: Int): WidgetSky {
            val h = hour.mod(24)
            return when {
                h < SunWidgetPhase.DAY_START -> NIGHT
                h < 9 -> DAWN
                h < 13 -> MORNING
                h < 17 -> MIDDAY
                h < 19 -> AFTERNOON
                h < SunWidgetPhase.NIGHT_START -> DUSK
                else -> NIGHT
            }
        }

        /**
         * Minutes from the given local time until the sky next steps. Because the
         * boundaries include the sun's own phase flips (which are also the prompt
         * slots), the receiver arms its single alarm off this schedule alone —
         * containment guarded by WidgetSkyTest. Always strictly positive.
         */
        fun minutesUntilNextChange(hour: Int, minute: Int): Int =
            minutesUntilNext(BOUNDARY_HOURS, hour, minute)
    }
}

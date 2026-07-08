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
        /**
         * The sky for a given local hour-of-day (0–23; other values wrap). The
         * steps are the app's ambient keyframes on whole hours: dawn from the
         * sun's own 05 day-start, then 09/13/17/19 (the 16.5 keyframe rounds to
         * 17), dusk holding 19–21 until the moon — whose boundary the clock
         * (SunWidgetPhase) owns, so the dark sky lines up exactly with the moon.
         * The card refreshes on the line's 15-minute cadence (WidgetPrompts),
         * which subsumes these whole-hour steps, so the sky needs no schedule of
         * its own.
         */
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
    }
}

package com.minded.minded.widget

/**
 * The card widget's sky for a local hour - the widget-shaped echo of the app's
 * living ambient sky (extension/src/shared/skyTimeline.ts). The app interpolates
 * its background through pastel keyframes per minute; a widget can't (it is baked
 * PNGs repainted by a handful of inexact alarms), so the card *steps* between
 * card-sized renders of those same keyframes. Like the app, the steps ride the
 * real sun (WidgetSun) - the clock hours are only the no-location fallback. All
 * day skies are light pastels by design (the saturated skies live in the app's drag reveals),
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
         * steps are the app's ambient keyframes (skyTimeline.ts) on whole hours:
         * dawn from the 06 day-start, then morning 09, midday 13, afternoon 17
         * (the 16.5 keyframe rounds to 17), and dusk as the last light 18–19
         * before the moon. Night begins at SunWidgetPhase.NIGHT_START (19) - the
         * app's own boundary - so the dark sky, the moon, and the wordless card
         * all turn over together, in step with the app. The card refreshes on the
         * line's 15-minute cadence (WidgetPrompts), which subsumes these
         * whole-hour steps, so the sky needs no schedule of its own.
         */
        fun forHour(hour: Int): WidgetSky =
            if (SunWidgetPhase.forHour(hour) == SunWidgetPhase.NIGHT) NIGHT
            else forSkyHour(hour.mod(24).toDouble())

        /**
         * The sky for a moment of light. By day [WidgetSun.Moment.skyHour] is the
         * palette clock's hour - timed to the real sun, so a winter afternoon
         * reaches the dusk face early, just as the app's sky does - bucketed onto
         * the same faces as [forHour]. Night is the moment's own, so the dark sky,
         * the moon, and the wordless card still turn over together.
         */
        fun forMoment(moment: WidgetSun.Moment): WidgetSky =
            if (moment.isNight) NIGHT else forSkyHour(moment.skyHour)

        /** The light-sky face for a palette-clock hour (the day buckets only). */
        internal fun forSkyHour(skyHour: Double): WidgetSky = when {
            skyHour < 9 -> DAWN
            skyHour < 13 -> MORNING
            skyHour < 17 -> MIDDAY
            skyHour < 18 -> AFTERNOON
            else -> DUSK
        }
    }
}

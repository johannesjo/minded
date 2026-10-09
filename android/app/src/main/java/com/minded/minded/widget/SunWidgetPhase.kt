package com.minded.minded.widget

/**
 * The time-of-day phase of the home-screen companion sun. The widget is a calm,
 * ambient anchor: glancing at it grounds you in where you actually are in the
 * day's natural rhythm of light - the sun by day, the moon by night. This is
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
        // deliberately do not split out dawn/dusk - their saturated, in-between
        // colours (amber/coral) read as an evaluative *signal* on a surface that
        // must never grade the user, and sun-vs-moon is the one shift everyone
        // reads as "the world", not "a message to me".
        //
        // These mirror the app's *fixed-clock* day/night boundary, not the live
        // one: since the true-sky change the app times night to the real sun
        // (extension/src/shared/sky/solarSky.ts - 4° below the horizon, from
        // the time zone's approximate location) and only falls back to 19:00 /
        // 06:00 (skyTimeline NIGHT_START_HOUR / NIGHT_END_HOUR) when the zone
        // gives no location. The widget has not been ported yet, so away from
        // the equinox it can flip sun↔moon up to a few hours apart from the
        // app. widgetClockMirror.test.ts keeps it on the fallback clock.
        // `internal` (not private) because WidgetPrompts and WidgetSky read these
        // - the single definition is what guarantees the card's no-text window is
        // exactly the moon's window.
        internal const val DAY_START = 6    // sun up = skyTimeline NIGHT_END_HOUR
        internal const val NIGHT_START = 19 // moon = skyTimeline NIGHT_START_HOUR

        /** The phase for a given local hour-of-day (0–23; other values wrap). */
        fun forHour(hour: Int): SunWidgetPhase =
            if (hour.mod(24) in DAY_START until NIGHT_START) DAY else NIGHT
    }
}

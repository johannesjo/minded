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
        // reads as "the world", not "a message to me".
        //
        // These are the app's own day/night boundary, not a widget-local one:
        // skyTimeline.ts turns the background dark AND the companion sun into the
        // moon at NIGHT_START_HOUR (19), back at NIGHT_END_HOUR (6). The widget
        // must flip on the same hours, or the home-screen sun shows a different
        // time of day than the app (its dusk sky while the app is already night).
        // widgetClockMirror.test.ts guards that the two stay in lockstep.
        // `internal` (not private) because WidgetPrompts and WidgetSky read these
        // — the single definition is what guarantees the card's no-text window is
        // exactly the moon's window.
        internal const val DAY_START = 6    // sun up = skyTimeline NIGHT_END_HOUR
        internal const val NIGHT_START = 19 // moon = skyTimeline NIGHT_START_HOUR

        /** The phase for a given local hour-of-day (0–23; other values wrap). */
        fun forHour(hour: Int): SunWidgetPhase =
            if (hour.mod(24) in DAY_START until NIGHT_START) DAY else NIGHT
    }
}

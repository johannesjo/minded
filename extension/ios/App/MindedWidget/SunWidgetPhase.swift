//
//  SunWidgetPhase.swift
//  MindedWidget
//
//  The time-of-day phase of the home-screen companion sun - the Swift twin of the
//  Android `widget/SunWidgetPhase.kt`. `forHour` mirrors the Kotlin one-to-one (the
//  JVM `SunWidgetPhaseTest` covers that logic); `nextBoundary(after:)` is a
//  WidgetKit-specific reimplementation that returns the next *Date* rather than the
//  Kotlin's minutes-until, so it has no Kotlin twin and no test yet - verify on a
//  device, or add a Swift test target. The widget is a calm, ambient anchor: glancing
//  at it grounds you in where you actually are in the day's natural light - the warm
//  sun by day, the cool moon by night. It is present-moment by construction (it
//  reads the real local hour, never a stale timestamp) and carries no metric, count,
//  or judgment. See docs/sun-companion-widget.md.
//
//  Pure logic, free of WidgetKit/SwiftUI references, so it mirrors the Kotlin
//  structure closely (and could be unit-tested the same way if a test target is added).
//

import Foundation

enum SunWidgetPhase {
    case day
    case night

    // Just two phases: the warm sun by day, the cool moon by night. We deliberately
    // do not split out dawn/dusk - their saturated, in-between colours (amber/coral)
    // read as an evaluative *signal* on a surface that must never grade the user, and
    // sun-vs-moon is the one shift everyone reads as "the world", not "a message to
    // me".
    //
    // These are the app's own day/night boundary, not a widget-local one:
    // skyTimeline.ts turns the background dark AND the companion sun into the moon at
    // NIGHT_START_HOUR (19), back at NIGHT_END_HOUR (6). The widget must flip on the
    // same hours, or the home-screen sun shows a different time of day than the app.
    // widgetClockMirror.test.ts guards that both native copies (this and the Android
    // SunWidgetPhase.kt) stay in lockstep with skyTimeline.
    static let dayStart = 6    // sun up = skyTimeline NIGHT_END_HOUR
    static let nightStart = 19 // moon = skyTimeline NIGHT_START_HOUR

    var isNight: Bool { self == .night }

    /// The phase for a given local hour-of-day (0–23; other values wrap).
    static func forHour(_ hour: Int) -> SunWidgetPhase {
        let h = ((hour % 24) + 24) % 24
        return (h >= dayStart && h < nightStart) ? .day : .night
    }

    /// The phase for a moment, read from its local hour.
    static func phase(at date: Date, calendar: Calendar = .current) -> SunWidgetPhase {
        forHour(calendar.component(.hour, from: date))
    }

    /// The next instant the phase changes, strictly after `date` (the next local
    /// 06:00 or 19:00, whichever comes first). The timeline reaches it through
    /// `WidgetPrompts.nextChange`, whose wordless-night branch is exactly this
    /// walk - so the moon gives way to the sun on the hour: the WidgetKit-native
    /// equivalent of the Android receiver's night-spanning alarm.
    /// DST/timezone-safe via `Calendar`. Strictly *after* `date`, so landing
    /// on a boundary schedules the following one, never an immediate re-fire.
    static func nextBoundary(after date: Date, calendar: Calendar = .current) -> Date? {
        [dayStart, nightStart]
            .compactMap { hour in
                calendar.nextDate(
                    after: date,
                    matching: DateComponents(hour: hour, minute: 0, second: 0),
                    matchingPolicy: .nextTime
                )
            }
            .min()
    }
}

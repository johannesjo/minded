//
//  SunWidgetPhase.swift
//  MindedWidget
//
//  The time-of-day phase of the home-screen companion sun — the Swift twin of the
//  Android `widget/SunWidgetPhase.kt`, ported one-to-one and covered by the same
//  cases in `SunWidgetPhaseTest.kt`. The widget is a calm, ambient anchor: glancing
//  at it grounds you in where you actually are in the day's natural light — the warm
//  sun by day, the cool moon by night. It is present-moment by construction (it
//  reads the real local hour, never a stale timestamp) and carries no metric, count,
//  or judgment. See docs/sun-companion-widget.md.
//
//  Pure logic, free of WidgetKit/SwiftUI references, so it mirrors the Kotlin
//  one-to-one (and could be unit-tested the same way if a test target is added).
//

import Foundation

enum SunWidgetPhase {
    case day
    case night

    // Just two phases: the warm sun by day, the cool moon by night. We deliberately
    // do not split out dawn/dusk — their saturated, in-between colours (amber/coral)
    // read as an evaluative *signal* on a surface that must never grade the user, and
    // sun-vs-moon is the one shift everyone reads as "the world", not "a message to
    // me". Boundaries ascending on the 24h clock; coarse on purpose — the sun does
    // not tick.
    static let dayStart = 5    // the sun is up
    static let nightStart = 21 // the moon

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
    /// 05:00 or 21:00, whichever comes first). The timeline uses this to place each
    /// boundary entry so the sun gives way to the moon — and back — exactly on the
    /// hour: the WidgetKit-native equivalent of the Android receiver's per-phase
    /// alarm. DST/timezone-safe via `Calendar`. Strictly *after* `date`, so landing
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

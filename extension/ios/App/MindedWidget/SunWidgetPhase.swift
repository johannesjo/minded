//
//  SunWidgetPhase.swift
//  MindedWidget
//
//  The time-of-day phase of the home-screen companion sun - the Swift twin of the
//  Android `widget/SunWidgetPhase.kt`; `forHour` / `forMoment` mirror the Kotlin
//  one-to-one (the JVM `SunWidgetPhaseTest` covers that logic). The widget is a calm, ambient anchor: glancing
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
    // These are the app's *fixed-clock* day/night boundary (skyTimeline
    // NIGHT_START_HOUR / NIGHT_END_HOUR) - its fallback for a time zone that gives
    // no location. Normally the widget, like the app, times night to the real sun
    // instead (`WidgetSun`, the port of solarSky.ts) and reaches these only through
    // that fallback. widgetClockMirror.test.ts keeps them (and the Android twin) on
    // the app's fallback clock.
    static let dayStart = 6    // sun up = skyTimeline NIGHT_END_HOUR
    static let nightStart = 19 // moon = skyTimeline NIGHT_START_HOUR

    var isNight: Bool { self == .night }

    /// The phase for a moment of light - the real sun's, or the clock's.
    static func forMoment(_ moment: WidgetSun.Moment) -> SunWidgetPhase {
        moment.isNight ? .night : .day
    }

    /// The fixed-clock phase for a local hour-of-day (0–23; other values wrap).
    static func forHour(_ hour: Int) -> SunWidgetPhase {
        let h = ((hour % 24) + 24) % 24
        return (h >= dayStart && h < nightStart) ? .day : .night
    }

    /// The phase for a moment, read from its light (the real sun where the zone
    /// has a place).
    static func phase(at date: Date, calendar: Calendar = .current) -> SunWidgetPhase {
        forMoment(WidgetSun.moment(at: date, calendar: calendar))
    }
}

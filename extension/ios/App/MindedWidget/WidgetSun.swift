//
//  WidgetSun.swift
//  MindedWidget
//
//  The true sky for the widget - the Swift twin of the Android `widget/WidgetSun.kt`
//  and a port of the app's extension/src/shared/sky/solarSky.ts (+ solarPosition.ts,
//  timeZoneLocation.ts). The home-screen sun gives way to the moon at the same real
//  dusk the app does, not at a fixed 19:00 that is broad daylight in a Berlin June
//  and an hour after dark in its December. There is only ever one sun; the widget
//  and the app must not disagree about whether it is up.
//
//  Only what a widget can show is ported: whether it is night (the moon, the dark
//  sky, the wordless card), where the light sky sits on the palette's clock
//  (which baked sky face to pick), and how much of the sunset is still in the
//  night sky (the afterglow - which picks the card's nightfall face over the deep
//  night one, `WidgetSky`). The stars stay in the app; the moon phase is
//  `WidgetMoon`'s.
//
//  Location comes from the time zone alone (`WidgetTimeZones`, generated from the
//  same table the app reads) - no permission, no network. An unknown zone (UTC,
//  Etc/…) falls back to the fixed clock, exactly like the app.
//
//  Pure logic, free of WidgetKit/SwiftUI references, mirroring the Kotlin
//  one-to-one (the JVM `WidgetSunTest` pins the shared numbers to the app's TS;
//  widgetSolarMirror.test.ts keeps both twins' constants on the TS ones).
//

import Foundation

enum WidgetSun {

    /// Golden hour ends / blue hour begins: the day↔night boundary (solarSky.ts).
    static let nightElevation = -4.0

    /// Astronomical night: the twilight has fully drained (solarSky.ts).
    static let trueNightElevation = -18.0

    // The afterglow is the sunset's warmth, evening only: it eases in over the
    // hour angle's first `afterglowEaseDeg` after solar noon and out over the
    // last before solar midnight (solarSky.ts eveningWeight).
    static let afterglowEaseDeg = 30.0

    // The fixed-clock fallback's afterglow window (skyTimeline.ts
    // nightAfterglowAt): full at night start (`SunWidgetPhase.nightStart`),
    // gone by this hour.
    static let nightAfterglowEndHour = 21.0

    // The palette clock's keyframe hours (skyTimeline.ts AMBIENT_SKY_KEYFRAMES).
    static let dawnHour = 6.0
    static let morningHour = 9.0
    static let middayHour = 13.0
    static let afternoonHour = 16.5
    static let duskHour = 19.0

    // Where each keyframe sits on the sun's climb, 0 (night boundary) → 1 (today's
    // noon height) - solarSky.ts RISING / SETTING, one-to-one.
    private static let rising: [(Double, Double)] = [(0, dawnHour), (0.5, morningHour), (1, middayHour)]
    private static let setting: [(Double, Double)] = [(1, middayHour), (0.6, afternoonHour), (0, duskHour)]

    private static let rad = Double.pi / 180

    struct LatLon {
        let lat: Double
        let lon: Double
    }

    /// The present moment's light: whether it is night (the moon), and the light
    /// sky's position on the palette clock (fed to `WidgetSky.forSkyHour`).
    struct Moment {
        let isNight: Bool
        let skyHour: Double
        /// False on the fixed-clock fallback.
        let fromSun: Bool
        /// The moon is seen flipped left-right from the south (`WidgetMoon`).
        var isSouthernHemisphere: Bool = false
        /// The sunset's warmth left in the night sky, 1 → 0 - the app's
        /// --night-afterglow (SkyMoment.afterglow). Always 0 by day.
        var afterglow: Double = 0
    }

    private static let utcCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }()

    /// The sun's elevation and hour angle (degrees) - solarPositionAt, ported.
    static func position(at date: Date, lat: Double, lon: Double)
        -> (elevation: Double, hourAngle: Double, declination: Double)
    {
        let c = utcCalendar.dateComponents([.year, .hour, .minute, .second], from: date)
        let startOfYear = utcCalendar.date(from: DateComponents(year: c.year, month: 1, day: 1))!
        let dayOfYear = (date.timeIntervalSince(startOfYear) / 86_400).rounded(.down) + 1
        let hour = Double(c.hour!) + Double(c.minute!) / 60 + Double(c.second!) / 3600
        let g = (2 * Double.pi / 365) * (dayOfYear - 1 + (hour - 12) / 24)

        let eqTimeMin = 229.18 * (
            0.000075
                + 0.001868 * cos(g)
                - 0.032077 * sin(g)
                - 0.014615 * cos(2 * g)
                - 0.040849 * sin(2 * g)
        )
        let decl = 0.006918
            - 0.399912 * cos(g)
            + 0.070257 * sin(g)
            - 0.006758 * cos(2 * g)
            + 0.000907 * sin(2 * g)
            - 0.002697 * cos(3 * g)
            + 0.00148 * sin(3 * g)

        let utcMin = Double(c.hour!) * 60 + Double(c.minute!) + Double(c.second!) / 60
        let trueSolarMin = utcMin + eqTimeMin + 4 * lon
        // Normalise to -180..180 so the sign says which side of noon we're on.
        let wrapped = (trueSolarMin / 4).truncatingRemainder(dividingBy: 360)
        let hourAngle = (wrapped < 0 ? wrapped + 360 : wrapped) - 180

        let phi = lat * rad
        let sinEl = sin(phi) * sin(decl) + cos(phi) * cos(decl) * cos(hourAngle * rad)
        return (
            elevation: asin(max(-1, min(1, sinEl))) / rad,
            hourAngle: hourAngle,
            declination: decl / rad
        )
    }

    private static func along(_ anchors: [(Double, Double)], _ p: Double) -> Double {
        for i in 1..<anchors.count {
            let (p0, h0) = anchors[i - 1]
            let (p1, h1) = anchors[i]
            if p >= min(p0, p1) && p <= max(p0, p1) {
                return h0 + (p - p0) / (p1 - p0) * (h1 - h0)
            }
        }
        return anchors[anchors.count - 1].1
    }

    /// How much of the evening a given hour angle is (solarSky.ts eveningWeight).
    private static func eveningWeight(_ hourAngle: Double) -> Double {
        if hourAngle <= 0 { return 0 }
        return max(0, min(1, hourAngle / afterglowEaseDeg))
            * max(0, min(1, (180 - hourAngle) / afterglowEaseDeg))
    }

    /// The clock fallback's afterglow at a fractional hour (nightAfterglowAt).
    static func nightAfterglow(atHour hour: Double) -> Double {
        let start = Double(SunWidgetPhase.nightStart)
        if hour < start || hour >= nightAfterglowEndHour { return 0 }
        return 1 - (hour - start) / (nightAfterglowEndHour - start)
    }

    /// The light at `date` for an observer at `location` - skyMomentAt.
    static func moment(at date: Date, location: LatLon) -> Moment {
        let pos = position(at: date, lat: location.lat, lon: location.lon)
        let isNight = pos.elevation < nightElevation
        // The twilight's depth: the afterglow drains as the stars come out.
        let starDepth = max(0, min(1,
            (nightElevation - pos.elevation) / (nightElevation - trueNightElevation)
        ))
        let noon = 90 - abs(location.lat - pos.declination)
        let p = noon > nightElevation
            ? max(0, min(1, (pos.elevation - nightElevation) / (noon - nightElevation)))
            : 0
        let skyHour = pos.hourAngle >= 0 ? along(setting, p) : along(rising, p)
        return Moment(
            isNight: isNight,
            skyHour: skyHour,
            fromSun: true,
            isSouthernHemisphere: location.lat < 0,
            afterglow: isNight ? (1 - starDepth) * eveningWeight(pos.hourAngle) : 0
        )
    }

    /// The fixed-clock fallback (no location) - clockSkyMoment.
    static func clockMoment(at date: Date, calendar: Calendar = .current) -> Moment {
        let c = calendar.dateComponents([.hour, .minute], from: date)
        let hour = c.hour ?? 0
        let fractionalHour = Double(hour) + Double(c.minute ?? 0) / 60
        return Moment(
            isNight: SunWidgetPhase.forHour(hour).isNight,
            skyHour: fractionalHour,
            fromSun: false,
            afterglow: nightAfterglow(atHour: fractionalHour)
        )
    }

    /// The light at `date` in the calendar's zone: the real sun when the zone has
    /// a place, the fixed clock otherwise.
    static func moment(at date: Date, calendar: Calendar = .current) -> Moment {
        if let location = WidgetTimeZones.location(for: calendar.timeZone.identifier) {
            return moment(at: date, location: location)
        }
        return clockMoment(at: date, calendar: calendar)
    }

    /// The next instant (to the minute) after `date` at which night begins or
    /// ends, or nil if none within `horizonHours` (polar day / polar night).
    /// Sampled every 10 minutes, then bisected to the minute - the same walk as
    /// solarSky.ts nightWindowsFrom and the Kotlin twin.
    static func nextNightFlip(
        after date: Date,
        calendar: Calendar = .current,
        horizonHours: Double = 48
    ) -> Date? {
        nextFlip(after: date, calendar: calendar, horizonHours: horizonHours) { $0.isNight }
    }

    /// The next instant (to the minute) after `date` at which the card's
    /// nightfall face begins or ends (`WidgetSky.nightfall` - the afterglow
    /// draining past its threshold), or nil if none within `horizonHours`. The
    /// same walk as `nextNightFlip`, and the Kotlin twin's `nextNightfallFlip`.
    static func nextNightfallFlip(
        after date: Date,
        calendar: Calendar = .current,
        horizonHours: Double = 48
    ) -> Date? {
        nextFlip(after: date, calendar: calendar, horizonHours: horizonHours) {
            WidgetSky.forMoment($0) == .nightfall
        }
    }

    private static func nextFlip(
        after date: Date,
        calendar: Calendar,
        horizonHours: Double,
        of state: @escaping (Moment) -> Bool
    ) -> Date? {
        let stateAt = { (t: Date) in state(moment(at: t, calendar: calendar)) }
        let start = stateAt(date)
        let end = date.addingTimeInterval(horizonHours * 3600)
        var lo = date
        var t = date.addingTimeInterval(step)
        while t <= end {
            if stateAt(t) != start {
                var hi = t
                while hi.timeIntervalSince(lo) > 60 {
                    let mid = lo.addingTimeInterval(hi.timeIntervalSince(lo) / 2)
                    if stateAt(mid) == start { lo = mid } else { hi = mid }
                }
                return hi
            }
            lo = t
            t = t.addingTimeInterval(step)
        }
        return nil
    }

    private static let step: TimeInterval = 10 * 60
}

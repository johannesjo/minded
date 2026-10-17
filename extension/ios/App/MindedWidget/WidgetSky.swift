//
//  WidgetSky.swift
//  MindedWidget
//
//  The card widget's sky for a local hour - the Swift twin of the Android
//  `widget/WidgetSky.kt` and the widget-shaped echo of the app's living ambient
//  sky (extension/src/shared/skyTimeline.ts). The app interpolates its background
//  through pastel keyframes per minute; a widget can't (it is baked PNGs repainted
//  per timeline entry), so the card *steps* between card-sized renders of those
//  same keyframes. Like the app, the steps ride the real sun (`WidgetSun`); the
//  clock hours are only the no-location fallback. All day skies are light pastels by design (the
//  saturated skies live in the app's drag reveals), so the near-black prompt text
//  stays legible on every one of them, and the stepping stays "the world's
//  light", never a signal graded at the user.
//
//  Pure logic, free of WidgetKit/SwiftUI references, mirroring the Kotlin
//  structure; the asset-name mapping lives in MindedWidget.swift (like Android's
//  drawable mapping in MyAppWidget.kt). widgetClockMirror.test.ts guards that the
//  faces stay in step with the app's keyframes on both platforms.
//

import Foundation

enum WidgetSky {
    case dawn, morning, midday, afternoon, dusk, nightfall, night

    /// The afterglow (`WidgetSun.Moment.afterglow`) down to which the card keeps
    /// its nightfall face - the dark sky still holding the sunset's warm horizon,
    /// baked at NIGHTFALL_AFTERGLOW_LEVEL (0.65) in gen_loading_sky.py - before
    /// it settles to the deep night one. Two stills stand in for the app's smooth
    /// 1 → 0 drain; bake at ~2/3 and switch at ~1/3, and neither is ever more than
    /// ~1/3 off the live sky. The Kotlin twin's NIGHTFALL_MIN_AFTERGLOW
    /// (widgetClockMirror.test.ts keeps them equal).
    static let nightfallMinAfterglow = 0.35

    /// One of the two dark skies - the moon's, never under text.
    var isNight: Bool { self == .nightfall || self == .night }

    /// The sky for a given local hour-of-day (0–23; other values wrap). The
    /// steps are the app's ambient keyframes (skyTimeline.ts) on whole hours:
    /// dawn from the 06 day-start, then morning 09, midday 13, afternoon 17
    /// (the 16.5 keyframe rounds to 17), and dusk as the last light 18–19
    /// before the moon. Night begins at SunWidgetPhase.nightStart (19) - the
    /// app's own boundary - so the dark sky, the moon, and the wordless card
    /// all turn over together, in step with the app (and with Android).
    static func forHour(_ hour: Int) -> WidgetSky {
        let h = ((hour % 24) + 24) % 24
        return SunWidgetPhase.forHour(h).isNight
            ? forAfterglow(WidgetSun.nightAfterglow(atHour: Double(h)))
            : forSkyHour(Double(h))
    }

    /// The sky for a moment of light. By day `skyHour` is the palette clock's
    /// hour - timed to the real sun, so a winter afternoon reaches the dusk face
    /// early, just as the app's sky does - bucketed onto the same faces as
    /// `forHour`. Night is the moment's own, so the dark sky, the moon and the
    /// wordless card still turn over together - and the night's first stretch
    /// keeps the sunset's afterglow, like the app's.
    static func forMoment(_ moment: WidgetSun.Moment) -> WidgetSky {
        moment.isNight ? forAfterglow(moment.afterglow) : forSkyHour(moment.skyHour)
    }

    /// The dark face for a night's afterglow: nightfall, then deep night.
    static func forAfterglow(_ afterglow: Double) -> WidgetSky {
        afterglow >= nightfallMinAfterglow ? .nightfall : .night
    }

    /// The light-sky face for a palette-clock hour (the day buckets only).
    static func forSkyHour(_ skyHour: Double) -> WidgetSky {
        if skyHour < 9 { return .dawn }
        if skyHour < 13 { return .morning }
        if skyHour < 17 { return .midday }
        if skyHour < 18 { return .afternoon }
        return .dusk
    }
}

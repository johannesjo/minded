//
//  WidgetSky.swift
//  MindedWidget
//
//  The card widget's sky for a local hour — the Swift twin of the Android
//  `widget/WidgetSky.kt` and the widget-shaped echo of the app's living ambient
//  sky (extension/src/shared/skyTimeline.ts). The app interpolates its background
//  through pastel keyframes per minute; a widget can't (it is baked PNGs repainted
//  per timeline entry), so the card *steps* between card-sized renders of those
//  same keyframes on whole hours. All day skies are light pastels by design (the
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
    case dawn, morning, midday, afternoon, dusk, night

    /// The sky for a given local hour-of-day (0–23; other values wrap). The
    /// steps are the app's ambient keyframes (skyTimeline.ts) on whole hours:
    /// dawn from the 06 day-start, then morning 09, midday 13, afternoon 17
    /// (the 16.5 keyframe rounds to 17), and dusk as the last light 18–19
    /// before the moon. Night begins at SunWidgetPhase.nightStart (19) — the
    /// app's own boundary — so the dark sky, the moon, and the wordless card
    /// all turn over together, in step with the app (and with Android).
    static func forHour(_ hour: Int) -> WidgetSky {
        let h = ((hour % 24) + 24) % 24
        if h < SunWidgetPhase.dayStart { return .night }
        if h < 9 { return .dawn }
        if h < 13 { return .morning }
        if h < 17 { return .midday }
        if h < 18 { return .afternoon }
        if h < SunWidgetPhase.nightStart { return .dusk }
        return .night
    }
}

//
//  WidgetMoon.swift
//  MindedWidget
//
//  The moon's phase for the widget - the Swift twin of the Android
//  `widget/WidgetMoon.kt`, and a port of the app's lunarPhase.ts + moonShadow.ts.
//  In the app the night companion is tonight's moon, a crescent or a gibbous with
//  its dark side veiled by earthshine; a widget that always drew a full moon would
//  be a second, different moon on the home screen. There is only ever one.
//
//  `luneOutline` gives the lit lune's outline in disc units (0..100 across the
//  disc's box, y down); `CompanionSun` fills everything else on the disc with the
//  earthshine, softly blurred. Pure logic, mirroring the Kotlin one-to-one (the
//  JVM `WidgetMoonTest` covers the shared arithmetic; widgetSolarMirror.test.ts
//  pins the constants to the TS).
//

import Foundation
import CoreGraphics

enum WidgetMoon {

    static let synodicMonthDays = 29.530588853

    /// The new moon of 2000-01-06 18:14 UTC - lunarPhase.ts's reference epoch.
    private static let referenceNewMoon = Date(timeIntervalSince1970: 947_182_440)

    /// The earthshine: the dark side's colour (#141e3d) and how much it veils.
    static let earthshineRGB = (r: 0x14, g: 0x1E, b: 0x3D)
    static let earthshineOpacity = 0.7

    /// The terminator's softness: a gaussian of this σ, in disc units (of 100).
    static let blurStdDeviation: CGFloat = 3

    /// How far past the lit limb the light may reach before the blur, at most.
    private static let limbMargin = 20.0

    /// Above this lit fraction the shadow is a hairline: draw a plain full moon.
    private static let fullMoonIllumination = 0.99

    /// Points per half-ellipse of the outline.
    private static let segments = 32

    struct Phase {
        let cycle: Double
        let illumination: Double
        let isWaxing: Bool
    }

    static func phase(at date: Date) -> Phase {
        let days = date.timeIntervalSince(referenceNewMoon) / 86_400
        let r = days.truncatingRemainder(dividingBy: synodicMonthDays)
        let age = r < 0 ? r + synodicMonthDays : r
        let cycle = age / synodicMonthDays
        return Phase(
            cycle: cycle,
            illumination: (1 - cos(2 * Double.pi * cycle)) / 2,
            isWaxing: cycle < 0.5
        )
    }

    /// The lit lune's outline (see the Kotlin twin): out along the limb from the
    /// top pole to the bottom one, then back up the terminator. Nil at (near)
    /// full moon. Lit on the right while waxing in the north, mirrored otherwise.
    static func luneOutline(_ phase: Phase, isSouthernHemisphere: Bool) -> [CGPoint]? {
        if phase.illumination >= fullMoonIllumination { return nil }
        let c = cos(2 * Double.pi * phase.cycle) // 1 new … -1 full
        let rx = 50 * abs(c)
        let bulge: Double = c > 0 ? 1 : -1
        let litWidth = 50 * (1 - c)
        let rLimb = 50 + min(limbMargin, 2 * litWidth)
        let mirror = phase.isWaxing == isSouthernHemisphere

        var points: [CGPoint] = []
        points.reserveCapacity(2 * segments + 2)
        func add(_ x: Double, _ y: Double) {
            points.append(CGPoint(x: mirror ? 100 - x : x, y: y))
        }
        for i in 0...segments {
            let t = -Double.pi / 2 + Double.pi * Double(i) / Double(segments)
            add(50 + rLimb * cos(t), 50 + 50 * sin(t))
        }
        for i in 0...segments {
            let t = Double.pi / 2 - Double.pi * Double(i) / Double(segments)
            add(50 + bulge * rx * cos(t), 50 + 50 * sin(t))
        }
        return points
    }
}

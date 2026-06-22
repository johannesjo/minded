//
//  CompanionSun.swift
//  MindedWidget
//
//  The home-screen / lock-screen companion sun, rendered in SwiftUI.
//
//  This is the WidgetKit twin of the Android `ic_sun_widget` vector
//  (res/drawable + res/drawable-night). The colours and proportions are ported
//  one-to-one from there so the home-screen sun matches the app's resting sun:
//  a near-white disc with a soft warm bloom (day), or a cool moon lit from the
//  upper-left (night). Day/night follows the system colour scheme, exactly like
//  Android's drawable-night qualifier — not the app's time-based rule. The widget
//  is a static snapshot (WidgetKit can't run the living, breathing in-app sun),
//  so this is the calm doorway, not the experience. See
//  docs/sun-companion-widget.md.
//

import SwiftUI

/// sRGB colour from 0–255 components, to keep the ported hex values readable.
private func rgb(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) -> Color {
    Color(.sRGB, red: r / 255, green: g / 255, blue: b / 255, opacity: a)
}

struct CompanionSun: View {
    let isNight: Bool

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            ZStack {
                glow(side: side)
                disc(side: side)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        // Keep the disc perfectly round regardless of the widget's aspect ratio.
        .aspectRatio(1, contentMode: .fit)
    }

    // The soft bloom / idle-breath halo: gentle, low-alpha, fading to nothing
    // at the rim. Spans the full tile (Android gradientRadius 53 over a 108
    // viewport ≈ the whole circle).
    private func glow(side: CGFloat) -> some View {
        let stops: [Gradient.Stop] = isNight
            ? [
                .init(color: rgb(216, 229, 255, 0), location: 0.00),
                .init(color: rgb(216, 229, 255, 0), location: 0.62),
                .init(color: rgb(207, 224, 255, 0.16), location: 0.80),
                .init(color: rgb(178, 202, 255, 0), location: 1.00),
            ]
            : [
                .init(color: rgb(255, 216, 119, 0), location: 0.00),
                .init(color: rgb(255, 216, 119, 0), location: 0.56),
                .init(color: rgb(255, 214, 115, 0.28), location: 0.74),
                .init(color: rgb(255, 203, 90, 0), location: 1.00),
            ]
        return Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(stops: stops),
                    center: .center,
                    startRadius: 0,
                    endRadius: side / 2
                )
            )
            .frame(width: side, height: side)
    }

    // The disc itself. Day: white warming to the faintest gold only at the very
    // rim. Night: the moon, lit from the upper-left like the in-app `.moon`.
    private func disc(side: CGFloat) -> some View {
        // Android disc diameters: day 72/108 ≈ 0.667, moon 84/108 ≈ 0.778.
        let diameterFactor: CGFloat = isNight ? 0.778 : 0.667
        let diameter = side * diameterFactor

        let stops: [Gradient.Stop] = isNight
            ? [
                .init(color: rgb(255, 255, 255), location: 0.00),
                .init(color: rgb(255, 255, 255), location: 0.18),
                .init(color: rgb(223, 232, 255), location: 0.58),
                .init(color: rgb(169, 184, 220), location: 1.00),
            ]
            : [
                .init(color: rgb(255, 255, 255), location: 0.00),
                .init(color: rgb(255, 255, 255), location: 0.84),
                .init(color: rgb(255, 245, 220), location: 1.00),
            ]

        // Day light source is centred; the moon's is offset upper-left to match
        // the Android moon. Android's gradient centre (40,37) is in the 108-unit
        // viewport; the centred 84-wide disc spans x∈[12,96], so in the disc's own
        // coordinates that is ((40-12)/84, (37-12)/84) ≈ (0.33, 0.30).
        let center: UnitPoint = isNight ? UnitPoint(x: 0.33, y: 0.30) : .center
        // Android moon gradientRadius 62 over the 84 disc ≈ 0.74 of its diameter.
        let endRadius: CGFloat = (isNight ? diameter * 0.74 : diameter / 2)

        return Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(stops: stops),
                    center: center,
                    startRadius: 0,
                    endRadius: endRadius
                )
            )
            .frame(width: diameter, height: diameter)
    }
}

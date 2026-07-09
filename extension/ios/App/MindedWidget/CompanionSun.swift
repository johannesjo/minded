//
//  CompanionSun.swift
//  MindedWidget
//
//  The home-screen / lock-screen companion sun, rendered in SwiftUI.
//
//  This is the WidgetKit twin of the Android `ic_sun_widget` assets. The two
//  phases match the app's resting sun:
//    - Day (06–19): a near-white disc warming to the faintest gold at the rim,
//      wrapped in a soft warm bloom. Drawn here with SwiftUI gradients, ported
//      one-to-one from the Android day vector (`res/drawable/ic_sun_widget_day.xml`).
//    - Night: the moon. This is the *same* lunar photo the Android widget and the
//      in-app `.moon` use (`res/drawable-nodpi/ic_sun_widget_night.webp`, re-encoded
//      as the `MoonWidget` image set) — the real near-side disc with its cool sheen
//      and halo already baked in, rather than a gradient twin the app deliberately
//      avoids (see docs/sun-companion-widget.md).
//
//  It just renders whichever it's told via `isNight`; the day/night *decision* is
//  the clock (`SunWidgetPhase`, picked by the timeline in MindedWidget.swift), the
//  same time-based rule as the Android widget — not the system colour scheme. The
//  widget is a static snapshot per phase (WidgetKit can't run the living, breathing
//  in-app sun), so this is the calm doorway, not the experience.
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
                if isNight {
                    moon(side: side)
                } else {
                    glow(side: side)
                    disc(side: side)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        // Keep the disc perfectly round regardless of the widget's aspect ratio.
        .aspectRatio(1, contentMode: .fit)
    }

    // The night moon: one image, disc + cool sheen + halo baked in, filling the
    // tile exactly as the Android night drawable fills its sun slot.
    private func moon(side: CGFloat) -> some View {
        Image("MoonWidget")
            .resizable()
            .interpolation(.high)
            .scaledToFit()
            .frame(width: side, height: side)
    }

    // The day sun's soft bloom / halo: gentle, low-alpha, fading to nothing at the
    // rim. Spans the full tile (Android gradientRadius 53 over a 108 viewport ≈ the
    // whole circle).
    private func glow(side: CGFloat) -> some View {
        let stops: [Gradient.Stop] = [
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

    // The day disc: white, warming to the faintest gold only at the very rim.
    private func disc(side: CGFloat) -> some View {
        // Android day disc diameter: 72/108 ≈ 0.667 of the tile.
        let diameter = side * 0.667

        let stops: [Gradient.Stop] = [
            .init(color: rgb(255, 255, 255), location: 0.00),
            .init(color: rgb(255, 255, 255), location: 0.84),
            .init(color: rgb(255, 245, 220), location: 1.00),
        ]

        return Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(stops: stops),
                    center: .center,
                    startRadius: 0,
                    endRadius: diameter / 2
                )
            )
            .frame(width: diameter, height: diameter)
    }
}

//
//  CompanionSun.swift
//  MindedWidget
//
//  The home-screen / lock-screen companion sun, rendered in SwiftUI.
//
//  This is the WidgetKit twin of the Android `ic_sun_widget` assets:
//    - Day (06–19): a near-white disc warming to the faintest gold at the rim,
//      wrapped in a soft bloom - white when it stands on the app's own sky (the
//      prompt card, matching the in-app resting sun), amber when it floats on the
//      user's wallpaper (the small widget). See `onOwnSky` below and THE HALO
//      RULE. Drawn here with SwiftUI gradients, ported one-to-one from the two
//      Android day vectors (`res/drawable/ic_sun_widget_day{,_on_sky}.xml`).
//    - Night: the moon - a cool disc whose light pools up-left and cools into the
//      lower-right limb, under wide soft maria fields, in a cool halo. Ported the
//      same one-to-one way from `res/drawable/ic_sun_widget_night.xml`, which is
//      itself the widget port of the in-app `.moon-face` (web Sun.scss). All three
//      are gradients over the same numbers, so they stay in step by construction.
//      This replaced a lunar photograph, at the same time the app's moon did:
//      there is only ever one moon, and a photo on the home screen against a drawn
//      one in the app would read as two different objects.
//
//  It just renders whichever it's told via `isNight`; the day/night *decision* is
//  the clock (`SunWidgetPhase`, picked by the timeline in MindedWidget.swift), the
//  same time-based rule as the Android widget - not the system colour scheme. The
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
    /// True when this sun stands on the app's own sky (the prompt card), false
    /// when it floats on the user's wallpaper (the small, transparent widget).
    ///
    /// THE HALO RULE (see sunSettle.ts in the web sources): the sun's body may be
    /// warm, but the light it casts is white on every surface we control. The
    /// amber bloom exists only for a background we DON'T control - the wallpaper
    /// here, arbitrary app content for the Little Sun - where the sun has to
    /// announce itself. Behind the card is our own sky, so there it glows white,
    /// exactly as it does in app. The moon ignores this: it never warms.
    var onOwnSky: Bool = false

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

    // The night moon. Mirrors the day's glow + disc split at the same radii, so
    // sun and moon occupy the same slot; only the face beneath differs.
    private func moon(side: CGFloat) -> some View {
        ZStack {
            moonGlow(side: side)
            moonDisc(side: side)
        }
    }

    // The moon's halo. THE HALO RULE's documented exception: the moon never warms,
    // on any surface, so this stays cool even out here on the wallpaper where the
    // day sun goes amber. Same stop positions and radius as glow() below.
    private func moonGlow(side: CGFloat) -> some View {
        Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(stops: [
                        .init(color: rgb(216, 229, 255, 0), location: 0.00),
                        .init(color: rgb(216, 229, 255, 0), location: 0.56),
                        .init(color: rgb(216, 229, 255, 0.32), location: 0.74),
                        .init(color: rgb(178, 202, 255, 0), location: 1.00),
                    ]),
                    center: .center,
                    startRadius: 0,
                    endRadius: side / 2
                )
            )
            .frame(width: side, height: side)
    }

    /// One mare, in fractions of the disc's diameter - the same numbers Sun.scss
    /// uses as percentages of the disc's box, and ic_sun_widget_night.xml as
    /// viewport units. They must stay big, overlapping and asymmetric: the tidy
    /// layout (a pair up top, one below) reads as a smiley face at companion size.
    private struct Mare {
        let cx: CGFloat, cy: CGFloat
        let rx: CGFloat, ry: CGFloat
        let alpha: Double, fade: CGFloat
    }

    // Top to bottom: Procellarum down the left limb, Imbrium running into it,
    // Serenitatis, Tranquillitatis, the Nubium/Humorum band, Fecunditatis, Crisium.
    private static let maria: [Mare] = [
        Mare(cx: 0.21, cy: 0.45, rx: 0.25, ry: 0.38, alpha: 0.30, fade: 0.78),
        Mare(cx: 0.37, cy: 0.27, rx: 0.24, ry: 0.21, alpha: 0.34, fade: 0.76),
        Mare(cx: 0.59, cy: 0.30, rx: 0.15, ry: 0.14, alpha: 0.30, fade: 0.78),
        Mare(cx: 0.67, cy: 0.43, rx: 0.17, ry: 0.16, alpha: 0.28, fade: 0.78),
        Mare(cx: 0.39, cy: 0.65, rx: 0.27, ry: 0.13, alpha: 0.24, fade: 0.80),
        Mare(cx: 0.75, cy: 0.57, rx: 0.11, ry: 0.13, alpha: 0.22, fade: 0.78),
        Mare(cx: 0.80, cy: 0.24, rx: 0.07, ry: 0.06, alpha: 0.26, fade: 0.74),
    ]

    private static let mareColor = rgb(168, 180, 203)

    // The moon's disc: the shaded body, then the maria over it. Same 72/108 ≈ 0.667
    // diameter as the day disc.
    private func moonDisc(side: CGFloat) -> some View {
        let diameter = side * 0.667

        return ZStack {
            // Light pooling up-left, cooling and dimming into the limb. The end
            // radius is CSS's farthest-corner for `circle at 38% 32%` in a square
            // box (≈0.92 of the diameter), so the falloff matches the web exactly.
            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(stops: [
                            .init(color: rgb(247, 249, 253), location: 0.00),
                            .init(color: rgb(230, 235, 244), location: 0.40),
                            .init(color: rgb(206, 214, 230), location: 0.76),
                            .init(color: rgb(182, 191, 212), location: 1.00),
                        ]),
                        center: UnitPoint(x: 0.38, y: 0.32),
                        startRadius: 0,
                        endRadius: diameter * 0.92
                    )
                )

            // Each mare is a circular gradient squashed to an ellipse, the same
            // trick the Android vector needs (a VectorDrawable radial gradient is
            // always circular) - kept here too so the two ports stay one shape.
            ForEach(Array(Self.maria.enumerated()), id: \.offset) { _, m in
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(stops: [
                                .init(color: Self.mareColor.opacity(m.alpha), location: 0),
                                .init(color: Self.mareColor.opacity(0), location: m.fade),
                            ]),
                            center: .center,
                            startRadius: 0,
                            endRadius: m.ry * diameter
                        )
                    )
                    .frame(width: 2 * m.ry * diameter, height: 2 * m.ry * diameter)
                    .scaleEffect(x: m.rx / m.ry, y: 1)
                    .position(x: m.cx * diameter, y: m.cy * diameter)
            }
        }
        .frame(width: diameter, height: diameter)
        // The maria fall to zero inside the rim by construction, but clip anyway:
        // .position on a scaled child is the one place a rounding slip would paint
        // outside the disc, and on a transparent widget that would be visible.
        .clipShape(Circle())
    }

    // The day sun's soft bloom / halo: gentle, low-alpha, fading to nothing at the
    // rim. Spans the full tile (Android gradientRadius 53 over a 108 viewport ≈ the
    // whole circle). Amber on the wallpaper, white on our own sky - same stops and
    // same alpha either way, so only the colour changes (see `onOwnSky` above and
    // the Android twins ic_sun_widget_day{,_on_sky}.xml).
    private func glow(side: CGFloat) -> some View {
        let stops: [Gradient.Stop] = onOwnSky
            ? [
                .init(color: rgb(255, 255, 255, 0), location: 0.00),
                .init(color: rgb(255, 255, 255, 0), location: 0.56),
                .init(color: rgb(255, 255, 255, 0.28), location: 0.74),
                .init(color: rgb(255, 255, 255, 0), location: 1.00),
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

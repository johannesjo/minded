//
//  MindedWidget.swift
//  MindedWidget
//
//  The home-screen companion sun widget - "option 1" from
//  docs/ios-platform-fit.md and the iOS twin of the Android App Widget
//  (widget/MyAppWidget.kt). It is presence and invitation, never an interrupt:
//  it never detects, blocks, or fires on its own. Tapping it opens the app at
//  `minded://sun`, which the native shell turns into the shared `?sun=open`
//  launch flag - the exact same trigger as tapping the in-app dashboard sun
//  (see RouteCmp's `?sun=open` effect). One shared trigger, two native shells.
//
//  Two faces, one widget (mirroring Android's responsive faces):
//  - `systemSmall` - the familiar floating sun, wordless. Alive to the day: the
//    warm sun by day, the cool moon by night (`SunWidgetPhase`).
//  - `systemMedium` - a miniature still of the in-app intervention screen: the
//    app's time-of-day sky (`WidgetSky`, card-sized dithered renders of the
//    exact app keyframes), one quiet serif line (`WidgetPrompts`), and the sun
//    resting beneath it. The line steps every 15 minutes through the waking day;
//    at night the prompt is nil and the moon carries the card alone. Tapping
//    carries the exact shown line (`minded://sun?line=…`) so the interaction
//    opens on that same NOTICE/ACTION_ADVICE. See docs/widget-prompts-concept.md.
//
//  The sun never animates, but it *is* alive to the day: instead of one static
//  `.never` snapshot, the provider pre-places every face change as a timeline
//  entry - 15-minute prompt steps by day (which contain the sky's whole-hour
//  steps and the day/night flips by construction), one wordless entry spanning
//  the night. Entries are deterministic, so nothing regenerates on unlock and
//  there is no refresh-budget pressure; `.atEnd` requests the next batch once
//  they're consumed. Day/night and sky are decided here by the clock, **not**
//  by the system colour scheme at render time.
//

import WidgetKit
import SwiftUI
import UIKit

// MARK: - Timeline (one entry per face change)

struct SunEntry: TimelineEntry {
    let date: Date
    let phase: SunWidgetPhase
    let sky: WidgetSky
    let prompt: String?
    /// Tonight's lit lune (`WidgetMoon`), nil by day and at (near) full moon.
    let moonOutline: [CGPoint]?
}

private func sunEntry(at date: Date) -> SunEntry {
    // One read of the light drives the sun/moon, the sky, and whether the card
    // carries words, so the three can never disagree (`WidgetSun`: the real sun,
    // like the app; the fixed clock only for a zone with no place).
    let moment = WidgetSun.moment(at: date)
    return SunEntry(
        date: date,
        phase: SunWidgetPhase.forMoment(moment),
        sky: WidgetSky.forMoment(moment),
        prompt: WidgetPrompts.prompt(at: date),
        moonOutline: moment.isNight
            ? WidgetMoon.luneOutline(
                WidgetMoon.phase(at: date),
                isSouthernHemisphere: moment.isSouthernHemisphere
            )
            : nil
    )
}

struct SunProvider: TimelineProvider {
    func placeholder(in context: Context) -> SunEntry {
        sunEntry(at: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SunEntry) -> Void) {
        completion(sunEntry(at: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SunEntry>) -> Void) {
        let now = Date()
        var entries: [SunEntry] = [sunEntry(at: now)]
        // Pre-place the upcoming face changes: quarter-hour prompt steps by day, a
        // single wordless entry across the night. 64 changes span a full waking
        // day (~16h) - well within a timeline batch; `.atEnd` refills after that.
        var cursor = now
        for _ in 0..<64 {
            guard let change = WidgetPrompts.nextChange(after: cursor) else { break }
            entries.append(sunEntry(at: change))
            cursor = change
        }
        // Never expected: if Calendar.nextDate failed outright, a single
        // already-consumed entry with `.atEnd` would ask WidgetKit to reload
        // immediately, in a loop - exactly the refresh-budget churn this design
        // avoids. Retry on a quarter-hour instead.
        guard entries.count > 1 else {
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(15 * 60))))
            return
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - Views

struct MindedWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetRenderingMode) private var renderingMode
    var entry: SunProvider.Entry

    var body: some View {
        // Day/night and the sky come from the entry's light (the real sun), not
        // the system colour scheme - so the moon shows at actual night, not
        // whenever the phone happens to be in dark mode (matches Android).
        switch family {
        case .accessoryCircular:
            // The Lock Screen: always drawn in the system's vibrant mode, which
            // keeps only alpha - so the purpose-built glyph, never the colour sun.
            SunGlyphWidget(entry: entry)
        case .systemMedium:
            if renderingMode == .fullColor {
                PromptCard(entry: entry)
            } else {
                // A tinted / clear Home Screen strips the sky and recolours
                // everything from its alpha: the gradient sun would collapse to a
                // flat blob, so the card keeps its words over the glyph instead.
                PromptCard(entry: entry, glyph: true)
            }
        default:
            if renderingMode == .fullColor {
                SunOnly(entry: entry)
            } else {
                SunGlyphWidget(entry: entry)
            }
        }
    }
}

/// The wordless floating sun (`systemSmall`).
private struct SunOnly: View {
    var entry: SunEntry

    var body: some View {
        CompanionSun(isNight: entry.phase.isNight, moonOutline: entry.moonOutline)
            .id(entry.phase.isNight)
            .softWidgetTransition()
            // The sun claims three quarters of the tile, like Android's bare sun
            // (SUN_ONLY_FRACTION) - the bloom fades to nothing at that edge, so
            // nothing clips. With the system content margins disabled (see the
            // configuration) this is the same on every iOS version.
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // The whole widget is the tap target - open the shared sun flag.
            .widgetURL(openSunURL(line: nil))
            .widgetTransparentContainerBackground()
    }
}

/// A miniature of the in-app intervention screen (`systemMedium`): the sky, a
/// serif line in the app's voice, the sun beneath it - text above, sun below,
/// the intervention layout (the WidgetKit twin of Android's PromptCard).
private struct PromptCard: View {
    var entry: SunEntry
    /// A tinted / clear Home Screen: no sky, no colour - the glyph sun, and the
    /// line in the system's own (tinted) foreground.
    var glyph: Bool = false

    var body: some View {
        VStack(spacing: 8) {
            if let prompt = entry.prompt {
                Text(prompt)
                    // The app's own serif voice (Newsreader - displayVoice()),
                    // bundled with the widget as a static Regular
                    // (scripts/gen_widget_font.py).
                    .font(promptFont)
                    // --c-fg-full-emphasis (light theme): rgba(0,0,0,.85). Only
                    // ever rendered on the light pastel day skies - night has no
                    // text, by construction (see WidgetPrompts) - and pinned so
                    // system dark mode can't invert it off its sky. Tinted, the
                    // system recolours it, so leave it the primary style there.
                    .foregroundStyle(
                        glyph
                            ? AnyShapeStyle(HierarchicalShapeStyle.primary)
                            : AnyShapeStyle(Color.black.opacity(0.85))
                    )
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    // A new line every quarter hour - let it cross-fade in, the
                    // way every in-app text change softens (iOS 17+).
                    .contentTransition(.opacity)
                    .id(prompt)
                    .softWidgetTransition()
            }
            Group {
                if glyph {
                    SunGlyph(isNight: entry.phase.isNight)
                } else {
                    // On our own sky the sun's halo is white, not amber (THE HALO
                    // RULE - see CompanionSun's `onOwnSky`); the amber is for the
                    // small widget, which floats on the user's wallpaper.
                    CompanionSun(
                        isNight: entry.phase.isNight,
                        onOwnSky: true,
                        moonOutline: entry.moonOutline
                    )
                }
            }
            .id(entry.phase.isNight)
            .softWidgetTransition()
            .frame(width: 54, height: 54)
        }
        // Matches Android's card padding (12dp); the system content margins are
        // disabled on the configuration so this is the whole inset.
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // Carry the exact line being shown so the tap lands on that same
        // interaction (nil at night → a plain sun-open).
        .widgetURL(openSunURL(line: entry.prompt))
        .widgetSkyBackground(glyph ? nil : skyImageName(entry.sky))
    }
}

/// The sun as a glyph, for every surface where the system keeps only alpha -
/// the Lock Screen (vibrant), and a tinted or clear Home Screen (accented). The
/// colour sun's soft gradients would flatten into a blob there; this keeps the
/// one shift everyone reads as the world: a solid disc by day, a hollow, faintly
/// filled one by night. Same 2/3-of-the-tile disc as the colour sun, so the two
/// occupy the same slot.
private struct SunGlyph: View {
    let isNight: Bool

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let disc = side * 0.667
            ZStack {
                if isNight {
                    Circle().fill(Color.white.opacity(0.35))
                    Circle().strokeBorder(Color.white, lineWidth: max(1.5, disc * 0.07))
                } else {
                    // A faint ring of light around the disc - the glyph's halo.
                    Circle()
                        .strokeBorder(Color.white.opacity(0.35), lineWidth: max(1, side * 0.04))
                        .frame(width: side * 0.86, height: side * 0.86)
                    Circle().fill(Color.white).frame(width: disc, height: disc)
                }
            }
            .frame(width: isNight ? disc : side, height: isNight ? disc : side)
            .frame(width: geo.size.width, height: geo.size.height)
            .widgetAccentable()
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

/// The small widget and the Lock Screen circle when only the glyph can show.
private struct SunGlyphWidget: View {
    @Environment(\.widgetFamily) private var family
    var entry: SunEntry

    var body: some View {
        SunGlyph(isNight: entry.phase.isNight)
            .id(entry.phase.isNight)
            .softWidgetTransition()
            .padding(family == .accessoryCircular ? 4 : 20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetURL(openSunURL(line: nil))
            .widgetTransparentContainerBackground()
    }
}

/// The card's line in Newsreader, the app's serif voice. Should the bundled font
/// ever fail to register, keep the register with the platform serif (New York)
/// rather than dropping to the system sans.
private let promptFont: Font = UIFont(name: "Newsreader-Regular", size: 16) != nil
    ? .custom("Newsreader-Regular", size: 16)
    : .system(size: 15, design: .serif)

/// Asset-catalog name for a sky face (same names as the Android drawables; the
/// PNGs are generated together by android/tools/gen_loading_sky.py).
private func skyImageName(_ sky: WidgetSky) -> String {
    switch sky {
    case .dawn: return "widget_sky_dawn"
    case .morning: return "widget_sky_morning"
    case .midday: return "widget_sky_midday"
    case .afternoon: return "widget_sky_afternoon"
    case .dusk: return "widget_sky_dusk"
    case .night: return "widget_sky_dark"
    }
}

/// The tap deep link. With a line, the native shell forwards it as
/// `&widgetLine=…` (strictly re-encoded to ASCII alphanumerics+`%`, so nothing
/// that could break out of the WebView hash can pass - see AppDelegate.swift)
/// and the shared flow opens that exact NOTICE/ACTION_ADVICE (RouteCmp's
/// widgetLine).
private func openSunURL(line: String?) -> URL? {
    var components = URLComponents()
    components.scheme = "minded"
    components.host = "sun"
    if let line = line {
        components.queryItems = [URLQueryItem(name: "line", value: line)]
    }
    return components.url
}

// MARK: - Widget

@main
struct MindedWidgetBundle: WidgetBundle {
    var body: some Widget {
        MindedSunWidget()
    }
}

struct MindedSunWidget: Widget {
    let kind = "MindedSunWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SunProvider()) { entry in
            MindedWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("minded – the sun")
        .description("Open the sun for a mindful moment.")
        // The faces lay out their own insets, matching Android - without this,
        // iOS 17+ adds ~16pt system margins on top and the sun shrinks by a
        // different amount on each OS version.
        .contentMarginsDisabled()
        // Home Screen faces, plus the Lock Screen circle. The Lock Screen renders
        // in the system's vibrant mode, which keeps only alpha - so it draws the
        // purpose-built `SunGlyph`, never the colour sun (which would collapse to
        // a flat blob there).
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular])
    }
}

// MARK: - iOS 16/17 compatibility

private extension View {
    /// iOS 17 requires widgets to declare a container background; iOS 16 has no
    /// such API. We want no background either way (the sun floats), so apply a
    /// clear `containerBackground` where it exists and no-op on iOS 16.
    @ViewBuilder
    func widgetTransparentContainerBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(.clear, for: .widget)
        } else {
            self
        }
    }

    /// The card's sky, edge to edge. The renders are vertical-only gradients, so
    /// stretching to the widget's aspect is the look (exactly how Android fills
    /// the card with FillBounds); the system's own shape mask rounds the corners
    /// on both OS generations. Nil (a tinted / clear Home Screen) is no sky.
    @ViewBuilder
    func widgetSkyBackground(_ imageName: String?) -> some View {
        if let imageName = imageName {
            if #available(iOSApplicationExtension 17.0, *) {
                self.containerBackground(for: .widget) {
                    Image(imageName).resizable()
                }
            } else {
                self.background { Image(imageName).resizable() }
            }
        } else {
            widgetTransparentContainerBackground()
        }
    }

    /// Softness for face changes between timeline entries: iOS 17+ animates
    /// from one entry to the next, and an opacity cross-fade is the in-app way
    /// every surface changes - never a hard cut. Earlier iOS swaps snapshots
    /// without animation, so this is simply inert there.
    func softWidgetTransition() -> some View {
        transition(.opacity)
    }
}

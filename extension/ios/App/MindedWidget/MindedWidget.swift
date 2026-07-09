//
//  MindedWidget.swift
//  MindedWidget
//
//  The home-screen companion sun widget — "option 1" from
//  docs/ios-platform-fit.md and the iOS twin of the Android App Widget
//  (widget/MyAppWidget.kt). It is presence and invitation, never an interrupt:
//  it never detects, blocks, or fires on its own. Tapping it opens the app at
//  `minded://sun`, which the native shell turns into the shared `?sun=open`
//  launch flag — the exact same trigger as tapping the in-app dashboard sun
//  (see RouteCmp's `?sun=open` effect). One shared trigger, two native shells.
//
//  Two faces, one widget (mirroring Android's responsive faces):
//  - `systemSmall` — the familiar floating sun, wordless. Alive to the day: the
//    warm sun by day, the cool moon by night (`SunWidgetPhase`).
//  - `systemMedium` — a miniature still of the in-app intervention screen: the
//    app's time-of-day sky (`WidgetSky`, card-sized dithered renders of the
//    exact app keyframes), one quiet serif line (`WidgetPrompts`), and the sun
//    resting beneath it. The line steps every 15 minutes through the waking day;
//    at night the prompt is nil and the moon carries the card alone. Tapping
//    carries the exact shown line (`minded://sun?line=…`) so the interaction
//    opens on that same NOTICE/ACTION_ADVICE. See docs/widget-prompts-concept.md.
//
//  The sun never animates, but it *is* alive to the day: instead of one static
//  `.never` snapshot, the provider pre-places every face change as a timeline
//  entry — 15-minute prompt steps by day (which contain the sky's whole-hour
//  steps and the day/night flips by construction), one wordless entry spanning
//  the night. Entries are deterministic, so nothing regenerates on unlock and
//  there is no refresh-budget pressure; `.atEnd` requests the next batch once
//  they're consumed. Day/night and sky are decided here by the clock, **not**
//  by the system colour scheme at render time.
//

import WidgetKit
import SwiftUI

// MARK: - Timeline (one entry per face change)

struct SunEntry: TimelineEntry {
    let date: Date
    let phase: SunWidgetPhase
    let sky: WidgetSky
    let prompt: String?
}

private func sunEntry(at date: Date, calendar: Calendar = .current) -> SunEntry {
    let hour = calendar.component(.hour, from: date)
    return SunEntry(
        date: date,
        phase: SunWidgetPhase.forHour(hour),
        sky: WidgetSky.forHour(hour),
        prompt: WidgetPrompts.prompt(at: date, calendar: calendar)
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
        // day (~16h) — well within a timeline batch; `.atEnd` refills after that.
        var cursor = now
        for _ in 0..<64 {
            guard let change = WidgetPrompts.nextChange(after: cursor) else { break }
            entries.append(sunEntry(at: change))
            cursor = change
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - Views

struct MindedWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: SunProvider.Entry

    var body: some View {
        // Day/night and the sky come from the entry's clock-derived values, not
        // the system colour scheme — so the moon shows at actual night, not
        // whenever the phone happens to be in dark mode (matches Android).
        switch family {
        case .systemMedium:
            PromptCard(entry: entry)
        default:
            SunOnly(entry: entry)
        }
    }
}

/// The wordless floating sun (`systemSmall`) — unchanged from v1.
private struct SunOnly: View {
    var entry: SunEntry

    var body: some View {
        CompanionSun(isNight: entry.phase.isNight)
            // A little breathing room so the soft bloom isn't clipped by the tile.
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // The whole widget is the tap target — open the shared sun flag.
            .widgetURL(openSunURL(line: nil))
            .widgetTransparentContainerBackground()
    }
}

/// A miniature of the in-app intervention screen (`systemMedium`): the sky, a
/// serif line in the app's voice, the sun beneath it — text above, sun below,
/// the intervention layout (the WidgetKit twin of Android's PromptCard).
private struct PromptCard: View {
    var entry: SunEntry

    var body: some View {
        VStack(spacing: 8) {
            if let prompt = entry.prompt {
                Text(prompt)
                    // The app's question voice is a serif (Newsreader); widgets
                    // can't ship web fonts, so the platform serif (New York)
                    // carries the same register — like Android's platform serif.
                    .font(.system(size: 15, design: .serif))
                    // --c-fg-full-emphasis (light theme): rgba(0,0,0,.85). Only
                    // ever rendered on the light pastel day skies — night has no
                    // text, by construction (see WidgetPrompts) — and pinned so
                    // system dark mode can't invert it off its sky.
                    .foregroundColor(Color.black.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }
            CompanionSun(isNight: entry.phase.isNight)
                .frame(width: 54, height: 54)
        }
        .padding(8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // Carry the exact line being shown so the tap lands on that same
        // interaction (nil at night → a plain sun-open).
        .widgetURL(openSunURL(line: entry.prompt))
        .widgetSkyBackground(skyImageName(entry.sky))
    }
}

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
/// `&widgetLine=…` (strictly re-encoded so nothing but the widget's own
/// quote-free text can reach the WebView hash — see AppDelegate.swift) and the
/// shared flow opens that exact NOTICE/ACTION_ADVICE (RouteCmp's widgetLine).
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
        // Home Screen only. A Lock Screen (`accessoryCircular`) variant
        // would render in the system's *vibrant* mode, which discards colour and
        // rebuilds the view from its alpha — our near-opaque white disc + low-alpha
        // bloom would collapse to a flat tinted blob, not a sun. That wants a
        // purpose-built alpha glyph; deferred rather than shipped looking broken.
        .supportedFamilies([.systemSmall, .systemMedium])
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
    /// on both OS generations.
    @ViewBuilder
    func widgetSkyBackground(_ imageName: String) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) {
                Image(imageName).resizable()
            }
        } else {
            self.background(Image(imageName).resizable())
        }
    }
}

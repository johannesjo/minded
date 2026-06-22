//
//  MindedWidget.swift
//  MindedWidget
//
//  The home-screen / lock-screen companion sun widget — "option 1" from
//  docs/ios-platform-fit.md and the iOS twin of the Android App Widget
//  (widget/MyAppWidget.kt). It is presence and invitation, never an interrupt:
//  it never detects, blocks, or fires on its own. Tapping it opens the app at
//  `minded://sun`, which the native shell turns into the shared `?sun=open`
//  launch flag — the exact same trigger as tapping the in-app dashboard sun
//  (see RouteCmp's `?sun=open` effect). One shared trigger, two native shells.
//
//  The content is a single static snapshot (no timeline, nothing to poll — the
//  sun is calm and unchanging), so the provider returns one entry with a
//  `.never` refresh policy, mirroring the Android receiver that dropped its
//  periodic alarm.
//

import WidgetKit
import SwiftUI

// MARK: - Timeline (a single, static entry)

struct SunEntry: TimelineEntry {
    let date: Date
}

struct SunProvider: TimelineProvider {
    func placeholder(in context: Context) -> SunEntry {
        SunEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SunEntry) -> Void) {
        completion(SunEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SunEntry>) -> Void) {
        // One entry, never refreshed: the sun is static, day/night is handled by
        // the system colour scheme at render time.
        completion(Timeline(entries: [SunEntry(date: Date())], policy: .never))
    }
}

// MARK: - View

struct MindedWidgetEntryView: View {
    @Environment(\.colorScheme) private var colorScheme
    var entry: SunProvider.Entry

    var body: some View {
        CompanionSun(isNight: colorScheme == .dark)
            // A little breathing room so the soft bloom isn't clipped by the tile.
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // The whole widget is the tap target — open the shared sun flag.
            .widgetURL(URL(string: "minded://sun"))
            .widgetTransparentContainerBackground()
    }
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
        // Home Screen only for v1. A Lock Screen (`accessoryCircular`) variant
        // would render in the system's *vibrant* mode, which discards colour and
        // rebuilds the view from its alpha — our near-opaque white disc + low-alpha
        // bloom would collapse to a flat tinted blob, not a sun. That wants a
        // purpose-built alpha glyph; deferred rather than shipped looking broken.
        .supportedFamilies([.systemSmall])
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
}

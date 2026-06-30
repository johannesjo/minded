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
//  The sun never animates, but it *is* alive to the day: it reflects the real
//  local hour — the warm sun by day, the cool moon by night — exactly like the
//  Android widget (`SunWidgetPhase`). So instead of one static `.never` snapshot,
//  the provider lays down the upcoming day/night boundaries as timeline entries; a
//  given snapshot is still unchanging, but the sun gives way to the moon (and back)
//  on the hour with no live refresh needed. Day/night is decided here by the clock,
//  **not** by the system colour scheme at render time.
//

import WidgetKit
import SwiftUI

// MARK: - Timeline (one entry per day/night phase)

struct SunEntry: TimelineEntry {
    let date: Date
    let phase: SunWidgetPhase
}

struct SunProvider: TimelineProvider {
    func placeholder(in context: Context) -> SunEntry {
        let now = Date()
        return SunEntry(date: now, phase: SunWidgetPhase.phase(at: now))
    }

    func getSnapshot(in context: Context, completion: @escaping (SunEntry) -> Void) {
        let now = Date()
        completion(SunEntry(date: now, phase: SunWidgetPhase.phase(at: now)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SunEntry>) -> Void) {
        let now = Date()
        var entries: [SunEntry] = [SunEntry(date: now, phase: SunWidgetPhase.phase(at: now))]
        // Pre-place the next few day/night boundaries so the sun flips on time even
        // before WidgetKit asks for a fresh timeline. A handful spans a couple of
        // days; `.atEnd` requests the next batch once they're consumed. The sun is
        // unchanging *within* a phase, so this is two snapshots a day, not a poll.
        var cursor = now
        for _ in 0..<4 {
            guard let boundary = SunWidgetPhase.nextBoundary(after: cursor) else { break }
            entries.append(SunEntry(date: boundary, phase: SunWidgetPhase.phase(at: boundary)))
            cursor = boundary
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - View

struct MindedWidgetEntryView: View {
    var entry: SunProvider.Entry

    var body: some View {
        // Day/night comes from the entry's clock-derived phase, not the system
        // colour scheme — so the moon shows at actual night, not whenever the phone
        // happens to be in dark mode (matches Android's `SunWidgetPhase`).
        CompanionSun(isNight: entry.phase.isNight)
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

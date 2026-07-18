//
//  WidgetPrompts.swift
//  MindedWidget
//
//  The single quiet line the card-sized companion widget carries above the sun -
//  the Swift twin of the Android `widget/WidgetPrompts.kt`. See
//  docs/widget-prompts-concept.md for the full rationale; the load-bearing rules:
//
//  - The line is a real interaction's content, so tapping the card lands on that
//    *exact* interaction. Only NOTICE cues and (short) ACTION_ADVICE lines
//    qualify - the app's two *ambient-safe* interaction modes: a present-moment
//    invitation in the world's voice, never a metric, never about the user, never
//    an open question left hanging on a semi-public surface. The tap carries the
//    shown line to the web shell (`minded://sun?line=…` → `&widgetLine=…`), which
//    reopens it as that NOTICE/ACTION_ADVICE (see AppDelegate + RouteCmp).
//  - The card is a mini-intervention, not wallpaper: the line steps every
//    `slotMinutes` through the day, fresh across returns yet far too slow to
//    reward re-checking within a session.
//  - Rotation is deterministic: the same moment always shows the same line - on
//    both platforms, since the arithmetic mirrors the Kotlin exactly. The index
//    steps once per 15-minute slot within the day AND one extra step at each day
//    boundary (`dailyStride`), so a habitual same-time-of-day glance walks the
//    whole pool across days instead of being locked to a fraction of it.
//  - At night: no words. The moon, alone. The no-text window is the moon's
//    window *by construction* - gated by SunWidgetPhase's own
//    dayStart/nightStart, so the near-black text can never meet the dark sky.
//
//  The lines are copied verbatim from the app's own interaction content
//  (NOTICE_CUES in notice.const.ts, ACTION_ADVICES in actionAdvices.ts).
//  // shortcut: hand-mirrored pool (Kotlin + Swift) - the jest parity test
//  // (widgetPromptsMirror.test.ts) asserts every line here exists verbatim in
//  // the TS pools AND matches the Kotlin pool one-to-one. Extract to a
//  // build-time generated shared source if a fourth consumer appears or the
//  // pool starts churning.
//
//  Pure logic, free of WidgetKit/SwiftUI references, mirroring the Kotlin
//  structure (unit-testable the same way if a Swift test target is added).
//

import Foundation

enum WidgetPrompts {

    /// The line steps once per quarter-hour through the day (see the header).
    static let slotMinutes = 15

    // 15-minute slots in a full day. The slot index counts these since the epoch
    // (through the night too, unseen), so each visible slot steps the line by one
    // - consecutive slots never repeat (the pool holds more than one line).
    private static let slotsPerDay = 24 * 60 / slotMinutes

    // How far the index advances at each *day* boundary: one extra step beyond a
    // day's slots. That "+1" fixes the same-time-of-day lock. With a plain slot
    // count the daily advance is `slotsPerDay % count` (= 96 % count), which
    // shared a factor of 3 with the old 15-line pool - so a glance at a habitual
    // time only ever surfaced 5 of the 15 lines (one residue class mod 3).
    // `slotsPerDay + 1` = 97 is prime, hence coprime with every pool size below
    // 97, so a fixed-time glance now walks the *whole* pool day to day whatever
    // its size - while within a day the step is still exactly one (no adjacent
    // repeats). Must match the Kotlin `DAILY_STRIDE` one-to-one.
    private static let dailyStride = slotsPerDay + 1

    // Every line is ≤60 chars of ASCII so it fits the card - enforced by the
    // Kotlin twin's MAX_PROMPT_LENGTH (JVM-tested) and pinned across platforms,
    // including AppDelegate's forwarding cap, by widgetPromptsMirror.test.ts.

    // Waking hours (06:00–19:00): embodied present-moment anchors and gentle
    // suggestions that complete on the spot - the NOTICE cues and short
    // ACTION_ADVICE lines, verbatim and in the same order as the Kotlin pool
    // (same order + same slot arithmetic = the same line at the same moment on
    // both platforms).
    static let wakingPrompts: [String] = [
        // NOTICE cues (notice.const.ts) - the "notice → tap" anchors.
        "Feel both feet on the floor.",
        "Let your jaw and shoulders soften.",
        "Let your hands fall open and rest.",
        "Listen for the most distant sound you can hear.",
        "Notice the texture under your fingertips.",
        "Feel the weight of your body, wherever you are.",
        "Notice the temperature of the air on your skin.",
        "Find three colors around you.",
        // ACTION_ADVICE lines (actionAdvices.ts) - the "How about…" suggestions.
        "How about looking out the window for a minute?",
        "How about a little stretch?",
        "How about some fresh air?",
        "How about a deep breath?",
        "How about some water?",
        "How about a minute away from the screen?",
        "How about resting your eyes on something far away?",
        // Present-moment questions (questions.ts, rendered via formatQuestionText,
        // so the "?" is part of the shown line the tap matches back). Only the
        // ambient-safe slice: world-voiced, universal, and self-exposing to no
        // onlooker on a semi-public home screen - the same bar as the NOTICE cues
        // above (see docs/widget-prompts-concept.md). The tap opens that exact
        // QUESTION interaction.
        "What can you hear right now, if you pause to listen?",
        "What do you notice in your body right now?",
        "What is one thing you can see that you usually overlook?",
        "What does the air feel like around you right now?",
        "What is one thing around you that is fine just as it is?",
        "Where do you feel tension in your body right now?",
        "What is one slow, ordinary thing you could do right now?",
        "What is already enough about this moment?",
        "What is one worry you could leave for tomorrow?",
        "What is something you are grateful for?",
        "What is something small that delighted you recently?",
    ]

    /// The line for a given local moment, or nil at night (the moon carries the
    /// night alone). Mirrors the Kotlin `promptForMoment` one-to-one: within a day
    /// the index steps exactly one line per slot - deterministic, no adjacent-slot
    /// repeats - walking the whole pool every `wakingPrompts.count` slots; across
    /// days it advances `dailyStride` so a fixed-time glance covers the whole pool
    /// too (see the `dailyStride` note).
    static func promptForMoment(epochDay: Int, hour: Int, minute: Int) -> String? {
        let h = ((hour % 24) + 24) % 24
        guard h >= SunWidgetPhase.dayStart && h < SunWidgetPhase.nightStart else {
            return nil
        }
        let m = ((minute % 60) + 60) % 60
        let slotOfDay = (h * 60 + m) / slotMinutes
        // Continuous slot count, but advancing `dailyStride` (not `slotsPerDay`)
        // per day so a habitual same-time glance walks the whole pool - see the
        // `dailyStride` note. Within a day epochDay is fixed, so the step is still
        // exactly one per slot.
        let index = epochDay * dailyStride + slotOfDay
        let count = wakingPrompts.count
        return wakingPrompts[((index % count) + count) % count]
    }

    /// The line for a moment, read from its local wall clock.
    static func prompt(at date: Date, calendar: Calendar = .current) -> String? {
        let comps = calendar.dateComponents([.hour, .minute], from: date)
        return promptForMoment(
            epochDay: epochDay(of: date, calendar: calendar),
            hour: comps.hour ?? 0,
            minute: comps.minute ?? 0
        )
    }

    /// Days since 1970-01-01 of the date's *local* calendar day - the twin of
    /// Kotlin's `LocalDate.toEpochDay()`, so the slot index (and therefore the
    /// displayed line) agrees across platforms.
    static func epochDay(of date: Date, calendar: Calendar = .current) -> Int {
        let utcOffset = Double(calendar.timeZone.secondsFromGMT(for: date))
        return Int(((date.timeIntervalSince1970 + utcOffset) / 86_400).rounded(.down))
    }

    /// The next instant the card's face changes, strictly after `date` - the
    /// WidgetKit twin of Kotlin's `minutesUntilNextChange`, returning a Date for
    /// the timeline instead of minutes for an alarm. By day the line steps on
    /// every quarter-hour edge (which contains the sky's whole-hour steps and the
    /// 19:00 phase flip by construction); across the wordless night nothing
    /// changes until the first line reappears at dayStart, so one entry spans the
    /// night. DST/timezone-safe via `Calendar`; landing exactly on an edge
    /// schedules the next one, never an immediate re-fire.
    static func nextChange(after date: Date, calendar: Calendar = .current) -> Date? {
        if SunWidgetPhase.phase(at: date, calendar: calendar).isNight {
            // From anywhere in the night the next phase boundary *is* the next
            // dayStart, so reuse the shipped v1 boundary walk as-is.
            return SunWidgetPhase.nextBoundary(after: date, calendar: calendar)
        }
        return stride(from: 0, to: 60, by: slotMinutes)
            .compactMap { minute in
                calendar.nextDate(
                    after: date,
                    matching: DateComponents(minute: minute, second: 0),
                    matchingPolicy: .nextTime
                )
            }
            .min()
    }
}

package com.minded.minded.widget

/**
 * The single quiet line the card-sized companion widget carries above the sun.
 * See docs/widget-prompts-concept.md for the full rationale; the load-bearing
 * rules:
 *
 * - The line is a real interaction's content, so tapping the card lands on that
 *   *exact* interaction. Only NOTICE cues and (short) ACTION_ADVICE lines
 *   qualify — the app's two *ambient-safe* interaction modes: a present-moment
 *   invitation in the world's voice, never a metric, never about the user, never
 *   an open question left hanging on a semi-public surface. Every other mode
 *   (questions, energy, emotion, usage, saved reasons) is off-limits here by
 *   those same rules. The tap carries the shown line to the web shell, which
 *   reopens it as that NOTICE/ACTION_ADVICE (see MainActivity + RouteCmp).
 * - Rotation is slow and boring by design: the epoch-day index turns over unseen
 *   at midnight (during the wordless night) and the new line first appears at
 *   05:00 — ~one text change a day. A faster-rotating widget is a tiny feed —
 *   "what does it say now?" is the exact loop minded fights.
 * - Rotation is deterministic: the same moment always shows the same line —
 *   nothing to refresh or fish for, and Glance recompositions on launcher
 *   events can't visibly shuffle it.
 * - At night: no words. The moon, alone. A line at 2 a.m. reads as a nudge.
 *   The no-text window is the moon's window *by construction* — the slot
 *   boundaries are built from [SunWidgetPhase]'s constants, so the near-black
 *   text can never meet the dark sky.
 *
 * The lines are copied verbatim from the app's own interaction content
 * (NOTICE_CUES in notice.const.ts, ACTION_ADVICES in actionAdvices.ts), curated
 * to the widget-safe subset that fits a home-screen card.
 * // shortcut: Kotlin-only mirror of the TS pools — a jest parity test
 * // (widgetPromptsMirror.test.ts) asserts every line here still exists verbatim
 * // in NOTICE_CUES/ACTION_ADVICES, and the web tap re-matches by that exact
 * // string. Extract to a generated shared JSON if the iOS widget ports this and
 * // becomes a third consumer.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
object WidgetPrompts {

    // The visible turnover points: the sun's own phase flips. The line is stable
    // across all of waking hours (one epoch-day index), so the only thing to
    // repaint is day-start (new line) and night (words → moon). Sharing
    // SunWidgetPhase's constants is what guarantees the no-text window is exactly
    // the moon's window.
    private val BOUNDARY_HOURS =
        intArrayOf(SunWidgetPhase.DAY_START, SunWidgetPhase.NIGHT_START)

    /** Hard cap so every line fits ~3 serif lines on a 3×2 card. */
    const val MAX_PROMPT_LENGTH = 60

    // Waking hours (05:00–21:00): embodied present-moment anchors and gentle
    // suggestions that complete on the spot — the NOTICE cues and short
    // ACTION_ADVICE lines, verbatim. Deliberately no open questions: one you
    // can't answer in place reads as friction on an ambient surface, and every
    // line here must map to a real interaction the tap can open.
    val WAKING_PROMPTS: List<String> = listOf(
        // NOTICE cues (notice.const.ts) — the "notice → tap" anchors.
        "Feel both feet on the floor.",
        "Let your jaw and shoulders soften.",
        "Let your hands fall open and rest.",
        "Listen for the most distant sound you can hear.",
        "Notice the texture under your fingertips.",
        "Feel the weight of your body, wherever you are.",
        "Notice the temperature of the air on your skin.",
        "Find three colors around you.",
        // ACTION_ADVICE lines (actionAdvices.ts) — the "How about…" suggestions.
        "How about looking out the window for a minute?",
        "How about a little stretch?",
        "How about some fresh air?",
        "How about a deep breath?",
        "How about some water?",
        "How about a minute away from the screen?",
        "How about resting your eyes on something far away?",
    )

    /**
     * The line for a given local day + hour, or null at night (the moon carries
     * the night alone). Deterministic, and because the index is the epoch day
     * itself, the rotation walks the pool exactly one line per day — no
     * adjacent-day repeats, no jumps (deterministic like sleepWindDown's
     * nightIdToIndex, minus that hash's uneven date-rollover steps).
     */
    fun promptForMoment(epochDay: Long, hour: Int): String? {
        val h = hour.mod(24)
        if (h !in SunWidgetPhase.DAY_START until SunWidgetPhase.NIGHT_START) {
            return null
        }
        return WAKING_PROMPTS[epochDay.mod(WAKING_PROMPTS.size.toLong()).toInt()]
    }

    /**
     * Whether [line] is one this widget actually shows. The deep-link handoff is
     * validated against this (MainActivity), mirroring the route allow-list: only
     * a known widget line can ever reach the WebView location.
     */
    fun isWidgetSafeLine(line: String): Boolean = line in WAKING_PROMPTS

    /**
     * Minutes from the given local time until the displayed line next changes
     * (day start, night). Because [BOUNDARY_HOURS] *are* the sun's phase flips,
     * this schedule also covers the day/night repaint — the receiver arms one
     * alarm off it alone (guarded by WidgetPromptsTest).
     */
    fun minutesUntilNextChange(hour: Int, minute: Int): Int =
        minutesUntilNext(BOUNDARY_HOURS, hour, minute)
}

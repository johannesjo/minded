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
 * - The card is a mini-intervention, not wallpaper. The doom-scroll moment is
 *   the unlock, and on iOS (docs/ios-platform-fit.md) the widget is the *only*
 *   surface that can meet it — there is no shield or overlay. So the line steps
 *   every SLOT_MINUTES through the day: a glance on return tends to find a fresh
 *   invitation, not the one sentence worn to wallpaper by the tenth look.
 * - Fresh across returns, still not a feed. 15 minutes is far too slow to reward
 *   idly refreshing — "what does it say now?" earns nothing for a quarter hour —
 *   yet fast enough that two returns spaced apart differ. The freshness lives
 *   between sessions, never within a single glance.
 * - Rotation is deterministic: the same moment always shows the same line, so a
 *   Glance/WidgetKit recomposition on a host event can't visibly shuffle it and
 *   there is nothing to refresh or fish for. The index is a continuous count of
 *   15-minute slots since the epoch, so it steps exactly once per slot with no
 *   adjacent repeats.
 * - At night: no words. The moon, alone. A line at 2 a.m. reads as a nudge.
 *   The no-text window is the moon's window *by construction* — it is gated by
 *   [SunWidgetPhase]'s own DAY_START/NIGHT_START, so the near-black text can
 *   never meet the dark sky.
 *
 * The lines are copied verbatim from the app's own interaction content
 * (NOTICE_CUES in notice.const.ts, ACTION_ADVICES in actionAdvices.ts), curated
 * to the widget-safe subset that fits a home-screen card.
 * // shortcut: hand-mirrored pools (this + the iOS WidgetPrompts.swift) — a jest
 * // parity test (widgetPromptsMirror.test.ts) asserts every line here still
 * // exists verbatim in NOTICE_CUES/ACTION_ADVICES and that the Swift pool
 * // matches this one one-to-one in order (same order + same slot arithmetic =
 * // the same line at the same moment on both platforms); the web tap re-matches
 * // by that exact string. Extract to a build-time generated shared source if a
 * // fourth consumer appears or the pool starts churning.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
object WidgetPrompts {

    /** The line steps once per quarter-hour through the day (see the header). */
    const val SLOT_MINUTES = 15

    // 15-minute slots in a full day. The slot index counts these since the epoch
    // (through the night too, unseen), so each visible slot steps the line by one
    // — consecutive slots never repeat (the pool holds more than one line).
    private const val SLOTS_PER_DAY = 24 * 60 / SLOT_MINUTES

    /** Hard cap so every line fits ~3 serif lines on a 3×2 card. */
    const val MAX_PROMPT_LENGTH = 60

    // Waking hours (06:00–19:00): embodied present-moment anchors and gentle
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
     * The line for a given local moment, or null at night (the moon carries the
     * night alone). The index is a continuous count of [SLOT_MINUTES] slots since
     * the epoch, so it steps exactly one line per slot — deterministic, no
     * adjacent-slot repeats — walking the whole pool every [WAKING_PROMPTS].size
     * slots (~3¾ h at a quarter-hour a step, so no line recurs within a session).
     */
    fun promptForMoment(epochDay: Long, hour: Int, minute: Int): String? {
        val h = hour.mod(24)
        if (h !in SunWidgetPhase.DAY_START until SunWidgetPhase.NIGHT_START) {
            return null
        }
        val slot = epochDay * SLOTS_PER_DAY + (h * 60 + minute.mod(60)) / SLOT_MINUTES
        return WAKING_PROMPTS[slot.mod(WAKING_PROMPTS.size.toLong()).toInt()]
    }

    /**
     * Whether [line] is one this widget actually shows. The deep-link handoff is
     * validated against this (MainActivity), mirroring the route allow-list: only
     * a known widget line can ever reach the WebView location.
     */
    fun isWidgetSafeLine(line: String): Boolean = line in WAKING_PROMPTS

    /**
     * Minutes from the given local time until the displayed line next changes.
     * By day the line steps every [SLOT_MINUTES]; across the wordless night
     * nothing changes until the first line reappears at [SunWidgetPhase.DAY_START],
     * so one alarm spans the night. The day steps are quarter-hour-aligned and
     * every sky/phase flip lands on a whole hour, so the receiver arms its single
     * alarm off this schedule alone and still catches them (containment guarded by
     * WidgetPromptsTest). Always strictly positive — landing exactly on a slot
     * edge schedules the next one, never an immediate re-fire.
     */
    fun minutesUntilNextChange(hour: Int, minute: Int): Int {
        val h = hour.mod(24)
        if (h !in SunWidgetPhase.DAY_START until SunWidgetPhase.NIGHT_START) {
            return minutesUntilNext(intArrayOf(SunWidgetPhase.DAY_START), h, minute)
        }
        return SLOT_MINUTES - minute.mod(SLOT_MINUTES)
    }
}

package com.minded.minded.widget

/**
 * The single quiet line the card-sized companion widget carries above the sun.
 * See docs/widget-prompts-concept.md for the full rationale; the load-bearing
 * rules:
 *
 * - The line is a real interaction's content, so tapping the card lands on that
 *   *exact* interaction. Only NOTICE cues and (short) ACTION_ADVICE lines
 *   qualify - the app's two *ambient-safe* interaction modes: a present-moment
 *   invitation in the world's voice, never a metric, never about the user, never
 *   an open question left hanging on a semi-public surface. Every other mode
 *   (questions, energy, emotion, usage, saved reasons) is off-limits here by
 *   those same rules. The tap carries the shown line to the web shell, which
 *   reopens it as that NOTICE/ACTION_ADVICE (see MainActivity + RouteCmp).
 * - The card is a mini-intervention, not wallpaper. The doom-scroll moment is
 *   the unlock, and on iOS (docs/ios-platform-fit.md) the widget is the *only*
 *   surface that can meet it - there is no shield or overlay. So the line steps
 *   every SLOT_MINUTES through the day: a glance on return tends to find a fresh
 *   invitation, not the one sentence worn to wallpaper by the tenth look.
 * - Fresh across returns, still not a feed. 15 minutes is far too slow to reward
 *   idly refreshing - "what does it say now?" earns nothing for a quarter hour -
 *   yet fast enough that two returns spaced apart differ. The freshness lives
 *   between sessions, never within a single glance.
 * - Rotation is deterministic: the same moment always shows the same line, so a
 *   Glance/WidgetKit recomposition on a host event can't visibly shuffle it and
 *   there is nothing to refresh or fish for. Within a day the index steps exactly
 *   once per 15-minute slot with no adjacent repeats; at each day boundary it
 *   advances one extra step ([DAILY_STRIDE]) so a habitual same-time-of-day
 *   glance walks the whole pool across days, not a fraction of it.
 * - At night: no words. The moon, alone. A line at 2 a.m. reads as a nudge.
 *   The no-text window is the moon's window *by construction* - it is gated by
 *   [SunWidgetPhase]'s own DAY_START/NIGHT_START, so the near-black text can
 *   never meet the dark sky.
 *
 * The lines are copied verbatim from the app's own interaction content
 * (NOTICE_CUES in notice.const.ts, ACTION_ADVICES in actionAdvices.ts), curated
 * to the widget-safe subset that fits a home-screen card.
 * // shortcut: hand-mirrored pools (this + the iOS WidgetPrompts.swift) - a jest
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
    // - consecutive slots never repeat (the pool holds more than one line).
    private const val SLOTS_PER_DAY = 24 * 60 / SLOT_MINUTES

    // How far the index advances at each *day* boundary: one extra step beyond a
    // day's slots. That "+1" fixes the same-time-of-day lock. With a plain slot
    // count the daily advance is `SLOTS_PER_DAY % size` (= 96 % size), which
    // shared a factor of 3 with the old 15-line pool - so a glance at a habitual
    // time only ever surfaced 5 of the 15 lines (one residue class mod 3).
    // SLOTS_PER_DAY + 1 = 97 is prime, hence coprime with every pool size below
    // 97, so a fixed-time glance now walks the *whole* pool day to day whatever
    // its size - while within a day the step is still exactly one (no adjacent
    // repeats). Must match the Swift `dailyStride` one-to-one.
    private const val DAILY_STRIDE = SLOTS_PER_DAY + 1

    /** Hard cap so every line fits ~3 serif lines on a 3×2 card. */
    const val MAX_PROMPT_LENGTH = 70

    // Waking hours (06:00–19:00): embodied present-moment anchors and gentle
    // suggestions that complete on the spot - the NOTICE cues and short
    // ACTION_ADVICE lines, verbatim. Deliberately no open questions: one you
    // can't answer in place reads as friction on an ambient surface, and every
    // line here must map to a real interaction the tap can open.
    val WAKING_PROMPTS: List<String> = listOf(
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
        "What do you need right now?",
        "What is something you take for granted?",
        "What helps you feel safe and at peace?",
        "Can you describe a calm place you might like?",
        "What can you do to make yourself more comfortable in this moment?",
        "What is something outside your control you could set down for now?",
        "What are you holding onto that you could loosen your grip on a little?",
        // Second wave of ambient-safe questions (docs/widget-prompts-concept.md,
        // "Extending the pool") - world-voiced, present-moment or gently
        // reflective, self-exposing to no onlooker, picked line-by-line across
        // categories. Must stay in the same order as the Swift pool.
        "What is something you are good at?",
        "What is a strength of yours?",
        "What makes you feel relaxed?",
        "What do you love about life?",
        "What accomplishments are you most proud of?",
        "What is something you always wanted to do?",
        "What is something new you could try?",
        "What is something you'd like to learn?",
        "What do you want in life?",
        "What makes you happy?",
        "What part of your life feels most alive right now?",
        "What would make tomorrow feel a little kinder?",
        "When are you at your best?",
        "Who makes you feel supported?",
        "Who brings out the best in you?",
        "Who would you like to thank?",
        "What food makes you happy?",
        "What helps you eat more slowly?",
    )

    /**
     * The line for a given local moment, or null at night (the moon carries the
     * night alone). Within a day the index steps exactly one line per slot -
     * deterministic, no adjacent-slot repeats - walking the whole pool every
     * [WAKING_PROMPTS].size slots (so no line recurs within a session); at each
     * day boundary it advances [DAILY_STRIDE] so a fixed-time-of-day glance covers
     * the whole pool across days too (see the [DAILY_STRIDE] note).
     */
    fun promptForMoment(epochDay: Long, hour: Int, minute: Int): String? {
        val h = hour.mod(24)
        if (h !in SunWidgetPhase.DAY_START until SunWidgetPhase.NIGHT_START) {
            return null
        }
        val slotOfDay = (h * 60 + minute.mod(60)) / SLOT_MINUTES
        // Continuous slot count, but advancing DAILY_STRIDE (not SLOTS_PER_DAY)
        // per day so a habitual same-time glance walks the whole pool - see the
        // DAILY_STRIDE note. Within a day epochDay is fixed, so the step is still
        // exactly one per slot.
        val index = epochDay * DAILY_STRIDE + slotOfDay
        return WAKING_PROMPTS[index.mod(WAKING_PROMPTS.size.toLong()).toInt()]
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
     * WidgetPromptsTest). Always strictly positive - landing exactly on a slot
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

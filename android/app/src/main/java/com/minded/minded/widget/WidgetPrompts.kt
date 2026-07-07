package com.minded.minded.widget

/**
 * The single quiet line the wide companion widget carries beside the sun. See
 * docs/widget-prompts-concept.md for the full rationale; the load-bearing rules:
 *
 * - World-voice invitations only ("Feel both feet on the floor.") — never a
 *   metric, never about the user, never an inferred feeling. A widget line
 *   lingers for hours, so it must be true at *any* minute of its slot.
 * - Rotation is slow and boring by design: the line changes only at the app's
 *   existing time boundaries (~2 text changes a day). A faster-rotating widget
 *   is a tiny feed — "what does it say now?" is the exact loop minded fights.
 * - Rotation is deterministic (the sleepWindDown nightIdToIndex pattern): the
 *   same moment always shows the same line — nothing to refresh or fish for,
 *   and Glance recompositions on launcher events can't visibly shuffle it.
 * - At night: no words. The moon, alone. A line at 2 a.m. reads as a nudge.
 *
 * The copy is a widget-specific register curated from the app's own content
 * (NOTICE_CUES in notice.const.ts, ACTION_ADVICES in actionAdvices.ts, the
 * gratitude prompts in sleepContent.ts), shortened to fit a home-screen card.
 * // shortcut: Kotlin-only pool — extract to a generated shared JSON when the
 * // iOS widget ports this and becomes a second consumer.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
object WidgetPrompts {

    // The app's existing time lines (TODAY_START_HOUR / EVENING_START_HOUR in
    // getInteractionMode.ts, NIGHT_START in SunWidgetPhase) — deliberately no
    // invented dayparts.
    private const val DAY_START = 5
    private const val EVENING_START = 20
    private const val NIGHT_START = 21

    private val BOUNDARY_HOURS = intArrayOf(DAY_START, EVENING_START, NIGHT_START)

    /** Hard cap so every line fits ~3 serif lines on a 3×2 card. */
    const val MAX_PROMPT_LENGTH = 60

    // Day: embodied present-moment anchors and gentle suggestions — things that
    // complete on the spot. Deliberately no open questions here: a question you
    // can't answer in place reads as friction on an ambient surface.
    val DAY_PROMPTS: List<String> = listOf(
        "Feel both feet on the floor.",
        "Let your jaw and shoulders soften.",
        "Let your hands fall open and rest.",
        "Listen for the most distant sound you can hear.",
        "Notice the texture under your fingertips.",
        "Feel the weight of your body, wherever you are.",
        "Notice the temperature of the air on your skin.",
        "Find three colors around you.",
        "How about looking out the window for a minute?",
        "How about a little stretch?",
        "How about some fresh air?",
        "How about a deep breath?",
        "How about some water?",
        "How about a minute away from the screen?",
        "How about resting your eyes on something far away?",
    )

    // Evening (20:00–21:00): one reflective line in the wind-down's gratitude
    // register — contemplation that needs no capture, gone when the moon comes.
    val EVENING_PROMPTS: List<String> = listOf(
        "What went well today?",
        "Who made today a little easier?",
        "What's something you're glad happened today?",
        "Who or what are you grateful for tonight?",
    )

    /**
     * The line for a given local date + hour, or null at night (the moon carries
     * the night alone). Deterministic: same date + slot → same line, and because
     * consecutive ISO dates mostly differ by one in their character sum, the
     * rotation walks the pool day by day instead of jumping randomly.
     */
    fun promptForMoment(dateIso: String, hour: Int): String? {
        val h = ((hour % 24) + 24) % 24
        val pool = when {
            h in DAY_START until EVENING_START -> DAY_PROMPTS
            h in EVENING_START until NIGHT_START -> EVENING_PROMPTS
            else -> return null
        }
        return pool[dateSeed(dateIso) % pool.size]
    }

    /**
     * Minutes from the given local time until the displayed line next changes
     * (day start, evening, night). Same contract as
     * [SunWidgetPhase.minutesUntilNextBoundary]: always strictly positive, so
     * landing exactly on a boundary schedules the following one.
     */
    fun minutesUntilNextChange(hour: Int, minute: Int): Int {
        val nowMin = (((hour % 24) + 24) % 24) * 60 + (((minute % 60) + 60) % 60)
        for (boundaryHour in BOUNDARY_HOURS) {
            val boundaryMin = boundaryHour * 60
            if (boundaryMin > nowMin) return boundaryMin - nowMin
        }
        return BOUNDARY_HOURS[0] * 60 + 24 * 60 - nowMin
    }

    // The sleepWindDown nightIdToIndex pattern: char-code sum of the ISO date.
    private fun dateSeed(dateIso: String): Int = dateIso.sumOf { it.code }
}

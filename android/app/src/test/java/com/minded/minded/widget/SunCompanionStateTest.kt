package com.minded.minded.widget

import com.minded.minded.util.DailyBudget
import com.minded.minded.util.DailyUsage
import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg
import com.minded.minded.util.getIsoDate
import org.junit.Test
import java.util.TimeZone
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SunCompanionStateTest {

    @Test
    fun `no budget configured shows a calm radiant sun with no label`() {
        val state = computeSunCompanionState(syncData(dailyBudget = null))
        assertEquals(SunMood.RADIANT, state.mood)
        assertNull(state.budgetFraction)
        assertEquals("", state.label)
    }

    @Test
    fun `full budget is radiant`() {
        val state = computeSunCompanionState(
            syncData(dailyBudget = DailyBudget(globalMinutes = 60, perSiteMinutes = null)),
        )
        assertEquals(SunMood.RADIANT, state.mood)
        // 60 minutes remaining renders in hours (see formatRemainingLabel / "2h30m" case).
        assertEquals("1h", state.label)
    }

    @Test
    fun `just over half budget stays radiant`() {
        // 60m budget, 29m used -> 31m remaining -> fraction ~0.517 (> 0.5).
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 29 * 60))
        assertEquals(SunMood.RADIANT, state.mood)
        assertEquals("31m", state.label)
    }

    @Test
    fun `exactly half budget dims`() {
        // 60m budget, 30m used -> fraction exactly 0.5 (<= DIMMING_THRESHOLD).
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 30 * 60))
        assertEquals(SunMood.DIMMING, state.mood)
        assertEquals("30m", state.label)
    }

    @Test
    fun `half spent budget dims`() {
        // 60m budget, 40m used -> 1/3 remaining (<= 0.5, > 0.15).
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 40 * 60))
        assertEquals(SunMood.DIMMING, state.mood)
        assertEquals("20m", state.label)
    }

    @Test
    fun `exactly at the low threshold reads as low`() {
        // 60m budget, 51m used -> 9m remaining -> fraction exactly 0.15 (<= LOW_THRESHOLD).
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 51 * 60))
        assertEquals(SunMood.LOW, state.mood)
        assertEquals("9m", state.label)
    }

    @Test
    fun `nearly spent budget reads as low`() {
        // 60m budget, 54m used -> 0.1 remaining (<= 0.15).
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 54 * 60))
        assertEquals(SunMood.LOW, state.mood)
        assertEquals("6m", state.label)
    }

    @Test
    fun `exhausted budget reads as spent`() {
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 60 * 60))
        assertEquals(SunMood.SPENT, state.mood)
        assertEquals(0f, state.budgetFraction)
    }

    @Test
    fun `wind-down snooze overrides budget and shows night`() {
        val state = computeSunCompanionState(
            usedSyncData(budgetMin = 60, usedSec = 0)
                .copy(sleepWindDownSnoozeUntilTS = Long.MAX_VALUE),
        )
        assertEquals(SunMood.NIGHT, state.mood)
        assertEquals("", state.label)
    }

    @Test
    fun `inside the wind-down window shows night regardless of budget`() {
        // Pin the clock to a fixed UTC instant (22:00) so the local-time window
        // check is deterministic; an all-days schedule removes day-of-week from
        // the picture. Budget is full, so this proves night wins over budget.
        val prevTz = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
        try {
            val at2200Utc = 1_609_538_400_000L // 2021-01-01 22:00:00 UTC
            val state = computeSunCompanionState(
                syncData(
                    dailyBudget = DailyBudget(globalMinutes = 60, perSiteMinutes = null),
                    sleepWindDown = windDownEveryDay(start = "20:00", end = "23:00"),
                ),
                nowMs = at2200Utc,
            )
            assertEquals(SunMood.NIGHT, state.mood)
            assertEquals("", state.label)
        } finally {
            TimeZone.setDefault(prevTz)
        }
    }

    @Test
    fun `sub-minute budget shows less-than-one-minute`() {
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 60 * 60 - 30))
        assertEquals(SunMood.LOW, state.mood)
        assertEquals("<1m", state.label)
    }

    @Test
    fun `hours render with an h suffix`() {
        val state = computeSunCompanionState(
            syncData(dailyBudget = DailyBudget(globalMinutes = 150, perSiteMinutes = null)),
        )
        assertEquals("2h30m", state.label)
    }

    private fun usedSyncData(budgetMin: Int, usedSec: Int): SyncData = syncData(
        dailyBudget = DailyBudget(globalMinutes = budgetMin, perSiteMinutes = null),
        dailyUsage = mapOf(getIsoDate() to DailyUsage(totalSeconds = usedSec, perSite = emptyMap())),
    )

    /** A wind-down schedule with the same window every day, so day-of-week is irrelevant. */
    private fun windDownEveryDay(start: String, end: String): Map<String, Any?> = mapOf(
        "enabled" to true,
        "days" to (0..6).associate { it.toString() to mapOf("start" to start, "end" to end) },
    )

    private fun syncData(
        dailyBudget: DailyBudget? = null,
        dailyUsage: Map<String, DailyUsage> = emptyMap(),
        sleepWindDown: Map<String, Any?>? = null,
    ): SyncData = SyncData(
        cfg = UserCfg(
            isOnboardingComplete = false,
            blockedHosts = emptyList(),
            blockedApps = emptyList(),
            focusSchedule = null,
            soundEnabled = null,
            sleepWindDown = sleepWindDown,
        ),
        answers = emptyList(),
        lastBlockedTS = 99L,
        lastBlockedUrl = "",
        moodCheckTS = 99L,
        moodCheckVal = "",
        moodCheckAdditional = "",
        energyLvlTS = 99L,
        energyLvlVal = 0,
        sunTaps = emptyMap(),
        attempts = emptyMap(),
        lastBrowsingBehaviorRatingTS = 99L,
        browsingBehaviorRating = emptyMap(),
        dailyQuestionsMorningTS = 99L,
        dailyQuestionsEveningTS = 99L,
        lastAppUsageRatingTS = 99L,
        appUsageRating = emptyMap(),
        selfAssessment = emptyMap(),
        alternativeApps = emptyList(),
        alternativeWebsites = emptyList(),
        emotionLabeling = null,
        budgetPromptDismissedTS = 99L,
        activeTimer = null,
        dailyBudget = dailyBudget,
        dailyUsage = dailyUsage,
        sleepWindDownDismissedNightId = "",
        sleepWindDownSnoozeUntilTS = 0L,
        sleepWindDownProgressNightId = "",
        sleepWindDownCompleted = emptyList(),
        sleepWindDownBrainDumpDraft = "",
    )
}

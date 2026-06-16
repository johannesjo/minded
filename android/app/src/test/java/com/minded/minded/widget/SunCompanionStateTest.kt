package com.minded.minded.widget

import com.minded.minded.util.DailyBudget
import com.minded.minded.util.DailyUsage
import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg
import com.minded.minded.util.getIsoDate
import org.junit.Test
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
        assertEquals("60m", state.label)
    }

    @Test
    fun `half spent budget dims`() {
        // 60m budget, 40m used -> 1/3 remaining (<= 0.5, > 0.15).
        val state = computeSunCompanionState(usedSyncData(budgetMin = 60, usedSec = 40 * 60))
        assertEquals(SunMood.DIMMING, state.mood)
        assertEquals("20m", state.label)
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

    private fun syncData(
        dailyBudget: DailyBudget? = null,
        dailyUsage: Map<String, DailyUsage> = emptyMap(),
    ): SyncData = SyncData(
        cfg = UserCfg(
            isOnboardingComplete = false,
            blockedHosts = emptyList(),
            blockedApps = emptyList(),
            focusSchedule = null,
            soundEnabled = null,
            sleepWindDown = null,
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

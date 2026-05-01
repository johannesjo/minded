package com.minded.minded.util

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BudgetHelperTest {

    @Test
    fun `should return 0 remaining when no budget configured`() {
        val syncData = createSyncData(dailyBudget = null)
        assertEquals(0, getBudgetRemainingSeconds(syncData))
    }

    @Test
    fun `should not have budget remaining when no budget configured`() {
        val syncData = createSyncData(dailyBudget = null)
        assertFalse(hasBudgetRemaining(syncData))
    }

    @Test
    fun `should return full budget when no usage today`() {
        val syncData = createSyncData(
            dailyBudget = DailyBudget(globalMinutes = 30, perSiteMinutes = null),
            dailyUsage = emptyMap()
        )
        assertEquals(1800, getBudgetRemainingSeconds(syncData))
    }

    @Test
    fun `should have budget remaining when no usage today`() {
        val syncData = createSyncData(
            dailyBudget = DailyBudget(globalMinutes = 30, perSiteMinutes = null),
            dailyUsage = emptyMap()
        )
        assertTrue(hasBudgetRemaining(syncData))
    }

    @Test
    fun `should subtract today usage from budget`() {
        val today = getIsoDate()
        val syncData = createSyncData(
            dailyBudget = DailyBudget(globalMinutes = 30, perSiteMinutes = null),
            dailyUsage = mapOf(today to DailyUsage(totalSeconds = 600, perSite = emptyMap()))
        )
        assertEquals(1200, getBudgetRemainingSeconds(syncData))
    }

    @Test
    fun `should return 0 when budget exhausted`() {
        val today = getIsoDate()
        val syncData = createSyncData(
            dailyBudget = DailyBudget(globalMinutes = 30, perSiteMinutes = null),
            dailyUsage = mapOf(today to DailyUsage(totalSeconds = 1800, perSite = emptyMap()))
        )
        assertEquals(0, getBudgetRemainingSeconds(syncData))
        assertFalse(hasBudgetRemaining(syncData))
    }

    @Test
    fun `should return 0 when usage exceeds budget`() {
        val today = getIsoDate()
        val syncData = createSyncData(
            dailyBudget = DailyBudget(globalMinutes = 30, perSiteMinutes = null),
            dailyUsage = mapOf(today to DailyUsage(totalSeconds = 2000, perSite = emptyMap()))
        )
        assertEquals(0, getBudgetRemainingSeconds(syncData))
    }

    @Test
    fun `should ignore yesterday usage`() {
        val yesterday = getIsoDate(java.time.LocalDate.now().minusDays(1))
        val syncData = createSyncData(
            dailyBudget = DailyBudget(globalMinutes = 30, perSiteMinutes = null),
            dailyUsage = mapOf(yesterday to DailyUsage(totalSeconds = 1800, perSite = emptyMap()))
        )
        assertEquals(1800, getBudgetRemainingSeconds(syncData))
        assertTrue(hasBudgetRemaining(syncData))
    }

    private fun createSyncData(
        dailyBudget: DailyBudget? = null,
        dailyUsage: Map<String, DailyUsage> = emptyMap()
    ): SyncData {
        return SyncData(
            cfg = UserCfg(
                isOnboardingComplete = false,
                blockedHosts = emptyList(),
                blockedApps = emptyList(),
                focusSchedule = null,
                soundEnabled = null,
                sleepWindDown = null
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
            sleepWindDownBrainDumpDraft = ""
        )
    }
}

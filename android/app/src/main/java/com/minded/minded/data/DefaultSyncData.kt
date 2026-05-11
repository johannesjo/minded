package com.minded.minded.data

import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg

val defaultSyncData = SyncData(
    cfg = UserCfg(
        isOnboardingComplete = false,
        blockedHosts = emptyList(),
        blockedApps = emptyList(),
        focusSchedule = null,
        soundEnabled = null,
        sleepWindDown = null
    ),
    answers = emptyList(),
    // NOTE: 99 is set to pass isToday check
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
    dailyBudget = null,
    dailyUsage = emptyMap(),
    sleepWindDownDismissedNightId = "",
    sleepWindDownSnoozeUntilTS = 0L,
    sleepWindDownProgressNightId = "",
    sleepWindDownCompleted = emptyList(),
    sleepWindDownBrainDumpDraft = "",
    sleepWindDownGratitudeDraft = "",
    sleepWindDownTomorrowDraft = ""
)

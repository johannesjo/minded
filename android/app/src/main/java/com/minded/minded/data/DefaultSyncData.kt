package com.minded.minded.data

import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg
import com.minded.minded.util.SessionGraceCfg
import com.minded.minded.util.PatternInsightState

val defaultSyncData = SyncData(
    cfg = UserCfg(
        isOnboardingComplete = false,
        blockedHosts = emptyList(),
        blockedApps = emptyList(),
        focusSchedule = null,
        soundEnabled = null,
        sleepWindDown = null,
        // On by default (5 min), matching the extension's DEFAULT_SYNC_DATA.
        sessionGrace = SessionGraceCfg(enabled = true, minutes = 5)
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
    alternatives = emptyList(),
    patternInsightState = PatternInsightState(emptyMap()),
    emotionLabeling = null,
    // Daily budget feature - REMOVED (#38). Dormant defaults kept only so the
    // Android <-> extension sync JSON contract stays stable. No writer/reader.
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

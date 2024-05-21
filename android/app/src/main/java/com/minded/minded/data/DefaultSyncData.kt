package com.minded.minded.data

import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg

val defaultSyncData = SyncData(
    cfg = UserCfg(
        isOnboardingComplete = false,
        blockedHosts = emptyList(),
        blockedApps = emptyList()
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
    browsingBehaviorRating = emptyMap()
)

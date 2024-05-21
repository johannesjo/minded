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
    lastBlockedTS = 0L,
    lastBlockedUrl = "",
    moodCheckTS = 0L,
    moodCheckVal = "",
    moodCheckAdditional = "",
    energyLvlTS = 0L,
    energyLvlVal = 0,
    blocked = emptyMap(),
    attempts = emptyMap(),
    lastBrowsingBehaviorRatingTS = 0L,
    browsingBehaviorRating = emptyMap()
)

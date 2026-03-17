package com.minded.minded.util

fun getBudgetRemainingSeconds(syncData: SyncData): Int {
    val budget = syncData.dailyBudget ?: return 0
    if (budget.globalMinutes <= 0) return 0
    val today = getIsoDate()
    val todayUsage = syncData.dailyUsage[today]
    val usedSeconds = todayUsage?.totalSeconds ?: 0
    val totalBudgetSeconds = budget.globalMinutes * 60
    return maxOf(0, totalBudgetSeconds - usedSeconds)
}

fun hasBudgetRemaining(syncData: SyncData): Boolean {
    return getBudgetRemainingSeconds(syncData) > 0
}

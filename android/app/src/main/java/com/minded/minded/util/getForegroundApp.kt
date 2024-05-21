package com.minded.minded.util

import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log

fun getForegroundApp(context: Context): String {
    val usageStatsManager =
        context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val endTimeNow = System.currentTimeMillis()
    val beginTime = endTimeNow - 1000 * 3600

    val usageStatsList =
        usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            beginTime,
            endTimeNow
        )

    if (usageStatsList != null && usageStatsList.isNotEmpty()) {
        var recentStats = usageStatsList[0]
        for (usageStats in usageStatsList) {
            if (usageStats.lastTimeUsed > recentStats.lastTimeUsed) {
                recentStats = usageStats
            }
        }

        val threshold = endTimeNow - recentStats.lastTimeStamp
        Log.v("SVC", "Foreground app: $threshold $endTimeNow ${recentStats.lastTimeStamp}")
        // never show if app was shown more than a second ago
        if (threshold > 1000) {
            return "NO_APP_WITHIN_THRESHOLD ${recentStats.packageName}"
        }
        return recentStats.packageName
    }
    return "UNKNOWN"
}

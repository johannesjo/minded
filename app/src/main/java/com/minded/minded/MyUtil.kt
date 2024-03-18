package com.minded.minded

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager

object MyUtil {
    fun checkPermission(context: Context, permission: String): Boolean {
        val res = context.checkCallingOrSelfPermission(permission)
        return res == PackageManager.PERMISSION_GRANTED
    }

    fun getForegroundApp(context: Context): String {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        val time = System.currentTimeMillis()
        val usageStatsList = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 3600, time)

        var foregroundApp = ""
        var lastUsedAppTime = 0L

        for (usageStats in usageStatsList) {
            if (usageStats.lastTimeUsed > lastUsedAppTime) {
                foregroundApp = usageStats.packageName
                lastUsedAppTime = usageStats.lastTimeUsed
            }
        }

        return foregroundApp
    }
}

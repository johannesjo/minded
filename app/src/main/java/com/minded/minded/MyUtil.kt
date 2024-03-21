package com.minded.minded

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings
import android.util.Log
import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QUESTION_CATEGORIES_ON_DASHBOARD
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.answers.Answer

object MyUtil {
    fun checkPermission(context: Context, permission: String): Boolean {
        val res = context.checkCallingOrSelfPermission(permission)
        return res == PackageManager.PERMISSION_GRANTED
    }

    fun checkUsageStatsPermission(context: Context): Boolean {
        val granted: Boolean
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        @Suppress("DEPRECATION") val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            context.packageName
        )
        granted = if (mode == AppOpsManager.MODE_DEFAULT) {
            context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED
        } else {
            mode == AppOpsManager.MODE_ALLOWED
        }

        return granted
    }

    fun checkDrawOverlayPermission(context: Context): Boolean {
        return Settings.canDrawOverlays(context)
    }

    fun getForegroundApp(context: Context): String {
        val usageStatsManager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val endTimeNow = System.currentTimeMillis()
        val beginTime = endTimeNow - 1000 * 3600

        val usageStatsList =
            usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, beginTime, endTimeNow)

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

    fun mapAnswersToQuestions(allAnswers: List<Answer>): List<QuestionCategoryForDashboard> {
        return QUESTION_CATEGORIES_ON_DASHBOARD.map { questionCategoryId ->
            val qc = QUESTION_CATEGORIES[questionCategoryId]
                ?: error("No question category for $questionCategoryId")
            QuestionCategoryForDashboard(
                qc.dashboardTxt,
                questionCategoryId,
                answers = allAnswers.filter { answer -> questionCategoryId == answer.questionCategoryId },
                qc.isTodayOnlyCategory,
                qc.isThisWeekOnlyCategory,
                qc.isQuestionLessWidget,
            )
        }.filter { it.answers.isNotEmpty() }
    }
}

package com.minded.minded

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QUESTION_CATEGORIES_ON_DASHBOARD
import com.minded.minded.data.QuestionCategoryForDashboard

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

        val time = System.currentTimeMillis()
        val usageStatsList = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            time - 1000 * 3600,
            time
        )

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

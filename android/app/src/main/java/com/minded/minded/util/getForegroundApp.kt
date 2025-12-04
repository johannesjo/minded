package com.minded.minded.util

import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log

private const val TAG = "UsageStats"

/**
 * Result type for foreground app detection via UsageStatsManager.
 * Provides structured results with confidence information.
 */
sealed class ForegroundAppResult {
    data class Success(val packageName: String, val ageMs: Long) : ForegroundAppResult()
    data class Stale(val packageName: String, val ageMs: Long) : ForegroundAppResult()
    data object NoAppDetected : ForegroundAppResult()
    data object NoPermission : ForegroundAppResult()
    data class Error(val message: String) : ForegroundAppResult()
}

/**
 * Gets the current foreground app using UsageStatsManager.
 *
 * Note: UsageStatsManager has inherent latency (500-2000ms) and should only be used
 * for validation/backup, not as primary detection method.
 *
 * @param context Android context
 * @param lookbackMs How far back to query (default 5 seconds, was incorrectly 1 hour before)
 * @return Package name of foreground app, or status string
 */
fun getForegroundApp(context: Context, lookbackMs: Long = 5000): String {
    return when (val result = getForegroundAppReliable(context, lookbackMs)) {
        is ForegroundAppResult.Success -> result.packageName
        is ForegroundAppResult.Stale -> "NO_APP_WITHIN_THRESHOLD ${result.packageName}"
        is ForegroundAppResult.NoAppDetected -> "NO_APP_DETECTED"
        is ForegroundAppResult.NoPermission -> "NO_PERMISSION"
        is ForegroundAppResult.Error -> "ERROR: ${result.message}"
    }
}

/**
 * Gets foreground app with structured result for better error handling.
 *
 * @param context Android context
 * @param lookbackMs How far back to query (default 5 seconds)
 * @param staleThresholdMs Consider data stale if older than this (default 2 seconds)
 * @return Structured result with app info and confidence
 */
fun getForegroundAppReliable(
    context: Context,
    lookbackMs: Long = 5000,
    staleThresholdMs: Long = 2000
): ForegroundAppResult {
    return try {
        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE)
            as? UsageStatsManager
            ?: return ForegroundAppResult.Error("UsageStatsManager not available")

        val endTime = System.currentTimeMillis()
        val beginTime = endTime - lookbackMs

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_BEST, // Use BEST for better granularity
            beginTime,
            endTime
        )

        if (stats.isNullOrEmpty()) {
            // Empty list usually means no permission granted
            Log.w(TAG, "No usage stats returned - permission may not be granted")
            return ForegroundAppResult.NoPermission
        }

        // Find the most recently used app within our lookback window
        val recentApp = stats
            .filter { it.lastTimeUsed > beginTime }
            .maxByOrNull { it.lastTimeUsed }

        if (recentApp == null) {
            Log.d(TAG, "No app used within lookback window of ${lookbackMs}ms")
            return ForegroundAppResult.NoAppDetected
        }

        val ageMs = endTime - recentApp.lastTimeUsed
        Log.v(TAG, "Foreground app: ${recentApp.packageName}, age: ${ageMs}ms")

        if (ageMs > staleThresholdMs) {
            return ForegroundAppResult.Stale(recentApp.packageName, ageMs)
        }

        ForegroundAppResult.Success(recentApp.packageName, ageMs)
    } catch (e: SecurityException) {
        Log.e(TAG, "Permission denied for UsageStatsManager", e)
        ForegroundAppResult.NoPermission
    } catch (e: Exception) {
        Log.e(TAG, "Error getting foreground app", e)
        ForegroundAppResult.Error(e.message ?: "Unknown error")
    }
}

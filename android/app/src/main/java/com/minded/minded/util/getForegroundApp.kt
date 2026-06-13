package com.minded.minded.util

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.util.Log
import com.minded.minded.BuildConfig

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

        // Prefer the event stream over aggregated stats: ACTIVITY_RESUMED
        // events have precise per-transition timestamps, while UsageStats'
        // lastTimeUsed is updated coarsely and lags real transitions.
        val eventResult = queryLastResumedApp(usageStatsManager, beginTime, endTime)
        if (eventResult != null) {
            return eventResult
        }

        // No activity transitions in the window (common when the user stays in
        // one app, and on OEMs with unreliable event journals) - fall back to
        // aggregated stats, which also lets us distinguish a quiet period from
        // a missing permission.
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

/**
 * Finds the app most recently brought to the foreground via the UsageEvents
 * stream. Returns null when the window contains no activity transitions, so
 * the caller can fall back to aggregated stats.
 */
private fun queryLastResumedApp(
    usageStatsManager: UsageStatsManager,
    beginTime: Long,
    endTime: Long
): ForegroundAppResult? {
    val events = usageStatsManager.queryEvents(beginTime, endTime) ?: return null
    val event = UsageEvents.Event()
    var lastResumedPackage: String? = null
    var lastResumedTime = 0L
    var pausedAfterResume = false

    while (events.hasNextEvent()) {
        events.getNextEvent(event)
        when (event.eventType) {
            UsageEvents.Event.ACTIVITY_RESUMED -> {
                lastResumedPackage = event.packageName
                lastResumedTime = event.timeStamp
                pausedAfterResume = false
            }
            UsageEvents.Event.ACTIVITY_PAUSED,
            UsageEvents.Event.ACTIVITY_STOPPED -> {
                if (event.packageName == lastResumedPackage && event.timeStamp >= lastResumedTime) {
                    pausedAfterResume = true
                }
            }
        }
    }

    if (lastResumedPackage == null) {
        return null
    }
    if (pausedAfterResume) {
        // The last foregrounded app was backgrounded again with nothing resumed
        // after it (e.g., screen off) - nothing is in the foreground
        if (BuildConfig.DEBUG) Log.v(TAG, "Last resumed app $lastResumedPackage was paused, no foreground app")
        return ForegroundAppResult.NoAppDetected
    }

    // Resumed and never paused since means the app is still in the foreground,
    // regardless of age - no staleness ambiguity like with aggregated stats
    val ageMs = endTime - lastResumedTime
    if (BuildConfig.DEBUG) Log.v(TAG, "Foreground app (events): $lastResumedPackage, age: ${ageMs}ms")
    return ForegroundAppResult.Success(lastResumedPackage, ageMs)
}

package com.minded.minded.util

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import com.minded.minded.data.SharedPreferenceService
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

private const val TAG = "UsageObservation"

// Mirror the shared TS constants (usageObservation.ts) so web and Android agree.
private const val MIN_BASELINE_DAYS = 3
private const val BASELINE_LOOKBACK_DAYS = 14
private const val MAX_TARGETS = 3
private const val DAY_MS = 24L * 60 * 60 * 1000

/**
 * Builds the present-moment usage observation (the replacement for the old
 * Great→Awful self-rating) from real OS data — `UsageStatsManager` foreground
 * time for the user's configured "use less" apps. Returns a JSON string of
 * `{ todaySeconds, baselineSeconds, topTargets:[{id,label,seconds}] }`, or null
 * when there's nothing usable to show (usage access not granted, no configured
 * apps, or no measurable usage today).
 *
 * `baselineSeconds` is "usual by this time of day": the average, over recent
 * days that had any usage, of foreground time accrued from midnight up to the
 * same elapsed point as now. Days with no usage are excluded (matching the web,
 * which only stores days the user actually visited a blocked target) so a fresh
 * install doesn't dilute the baseline toward zero.
 */
fun getAppUsageObservation(context: Context, now: Long = System.currentTimeMillis()): String? {
    if (!checkUsageStatsPermission(context)) {
        if (com.minded.minded.BuildConfig.DEBUG) Log.v(TAG, "No usage-stats permission")
        return null
    }

    val blockedApps = try {
        SharedPreferenceService(context).getBlockedApps()
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read blocked apps", e)
        emptyList()
    }
    if (blockedApps.isEmpty()) return null

    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE)
        as? UsageStatsManager ?: return null
    val blockedSet = blockedApps.toSet()

    val todayStart = startOfDay(now)
    val elapsedToday = now - todayStart

    val todayPerPkg = try {
        foregroundMsPerPackage(usageStatsManager, todayStart, now, blockedSet)
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read today's usage", e)
        return null
    }
    val todaySeconds = (todayPerPkg.values.sum() / 1000).toInt()

    // Baseline: average of recent days' usage through the same time of day.
    val priorCumulatives = mutableListOf<Long>()
    for (d in 1..BASELINE_LOOKBACK_DAYS) {
        val dayStart = startOfDay(now - d * DAY_MS)
        val dayEnd = dayStart + elapsedToday
        val cumulativeMs = try {
            foregroundMsPerPackage(usageStatsManager, dayStart, dayEnd, blockedSet)
                .values.sum()
        } catch (e: Exception) {
            0L
        }
        if (cumulativeMs > 0) priorCumulatives.add(cumulativeMs)
    }
    val baselineSeconds: Int? =
        if (priorCumulatives.size >= MIN_BASELINE_DAYS) {
            (priorCumulatives.average() / 1000).toInt()
        } else {
            null
        }

    val topTargets = JSONArray()
    todayPerPkg.entries
        .filter { it.value > 0 }
        .sortedByDescending { it.value }
        .take(MAX_TARGETS)
        .forEach { (pkg, ms) ->
            topTargets.put(
                JSONObject()
                    .put("id", pkg)
                    .put("label", resolveAppLabel(context, pkg))
                    .put("seconds", (ms / 1000).toInt())
            )
        }

    val result = JSONObject()
    result.put("todaySeconds", todaySeconds)
    if (baselineSeconds != null) result.put("baselineSeconds", baselineSeconds)
    result.put("topTargets", topTargets)
    return result.toString()
}

/**
 * Sums precise foreground time (ms) per package within [begin, end] from the
 * UsageEvents stream — pairing RESUMED with the next PAUSED/STOPPED, and
 * counting an app still foreground at `end` up to `end`.
 */
private fun foregroundMsPerPackage(
    usageStatsManager: UsageStatsManager,
    begin: Long,
    end: Long,
    packages: Set<String>,
): Map<String, Long> {
    val totals = HashMap<String, Long>()
    val resumedAt = HashMap<String, Long>()
    val events = usageStatsManager.queryEvents(begin, end) ?: return totals
    val event = UsageEvents.Event()

    while (events.hasNextEvent()) {
        events.getNextEvent(event)
        val pkg = event.packageName
        if (pkg !in packages) continue
        when (event.eventType) {
            UsageEvents.Event.ACTIVITY_RESUMED -> {
                resumedAt[pkg] = event.timeStamp
            }
            UsageEvents.Event.ACTIVITY_PAUSED,
            UsageEvents.Event.ACTIVITY_STOPPED -> {
                val start = resumedAt.remove(pkg)
                if (start != null && event.timeStamp >= start) {
                    totals[pkg] = (totals[pkg] ?: 0L) + (event.timeStamp - start)
                }
            }
        }
    }

    // Apps still in the foreground at the end of the window.
    for ((pkg, start) in resumedAt) {
        if (end >= start) {
            totals[pkg] = (totals[pkg] ?: 0L) + (end - start)
        }
    }

    return totals
}

private fun startOfDay(ts: Long): Long {
    val cal = Calendar.getInstance()
    cal.timeInMillis = ts
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

private fun resolveAppLabel(context: Context, packageName: String): String {
    return try {
        val pm = context.packageManager
        pm.getApplicationInfo(packageName, 0).loadLabel(pm).toString()
    } catch (e: PackageManager.NameNotFoundException) {
        packageName
    } catch (e: Exception) {
        packageName
    }
}

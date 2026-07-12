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
private const val MAX_TARGETS = 3

/**
 * Builds the present-moment usage observation (the replacement for the old
 * Great→Awful self-rating) from real OS data — `UsageStatsManager` foreground
 * time for the user's configured "use less" apps. Returns a JSON string of
 * `{ todaySeconds, topTargets:[{id,label,seconds}] }`, or null when there's
 * nothing usable to show (usage access not granted, no configured apps, or no
 * measurable usage today).
 *
 * Deliberately NO baseline/"usual by this time of day" field (mirrors
 * usageObservation.ts): comparing today against a personal average reads as a
 * benchmark, the judgment register the app avoids. Today's observed fact only.
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

    val todayPerPkg = try {
        foregroundMsPerPackage(usageStatsManager, todayStart, now, blockedSet)
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read today's usage", e)
        return null
    }
    val todaySeconds = (todayPerPkg.values.sum() / 1000).toInt()

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

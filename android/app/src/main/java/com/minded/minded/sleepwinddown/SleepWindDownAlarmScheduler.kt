package com.minded.minded.sleepwinddown

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.minded.minded.data.SharedPreferenceService
import java.util.Calendar

/**
 * Schedules an inexact AlarmManager wake-up at the next configured bedtime.
 * Inexact (`setAndAllowWhileIdle`) is used deliberately so we don't need
 * the `SCHEDULE_EXACT_ALARM` runtime grant on Android 12+; a several-minute
 * fuzz on a "wind down for the night" prompt is fine.
 *
 * The scheduler is the source of truth for "fire the wind-down at bedtime
 * even if the user hasn't unlocked the phone."
 */
object SleepWindDownAlarmScheduler {
    private const val TAG = "SleepWindDownAlarm"
    private const val REQUEST_CODE = 6623

    /** Cancel any pending alarm. Idempotent. */
    fun cancel(context: Context) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        am.cancel(buildPendingIntent(context))
        Log.d(TAG, "Cancelled wind-down alarm")
    }

    /**
     * Schedule the next alarm given the user's current cfg.
     *
     * The target is whichever comes first:
     *   - the active snooze deadline (if any), or
     *   - the next configured bedtime.
     *
     * No-op (cancels the pending alarm and dismisses any visible notification)
     * if wind-down is disabled, onboarding is incomplete, or no day has a
     * configured range.
     */
    fun scheduleNext(context: Context) {
        val syncData = SharedPreferenceService(context).getSyncData()
        val cfg = syncData.cfg
        if (cfg.sleepWindDown == null) {
            cancelAll(context)
            return
        }
        val enabled = cfg.sleepWindDown["enabled"] as? Boolean ?: false
        if (!enabled || !cfg.isOnboardingComplete) {
            cancelAll(context)
            return
        }

        val now = System.currentTimeMillis()
        val snoozeUntil = syncData.sleepWindDownSnoozeUntilTS
        val nextBedtime = computeNextBedtime(cfg, now)
        val candidates = listOfNotNull(
            nextBedtime,
            snoozeUntil.takeIf { it > now },
        )
        val target = candidates.minOrNull()
        if (target == null) {
            Log.d(TAG, "No bedtime / snooze in the next 8 days; cancelling")
            cancelAll(context)
            return
        }
        scheduleAt(context, target)
    }

    /** Cancel both the alarm and any visible notification. */
    private fun cancelAll(context: Context) {
        cancel(context)
        SleepWindDownNotifier.cancel(context)
    }

    /** Schedule an alarm at a specific epoch ms. Used by snooze and by scheduleNext. */
    fun scheduleAt(context: Context, atMs: Long) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = buildPendingIntent(context)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi)
            } else {
                @Suppress("DEPRECATION")
                am.set(AlarmManager.RTC_WAKEUP, atMs, pi)
            }
            Log.d(TAG, "Scheduled wind-down alarm at $atMs")
        } catch (e: SecurityException) {
            Log.e(TAG, "Cannot schedule alarm", e)
        }
    }

    private fun buildPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, SleepWindDownAlarmReceiver::class.java)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Find the next configured bedtime at or after `nowMs`.
     *
     * If we are *currently* inside a wind-down window (whether that window
     * started today or rolled over from yesterday), returns `nowMs + 5s` so
     * the alarm fires immediately and the receiver can post the notification.
     * Otherwise walks up to 8 days forward to find the next bedtime start.
     *
     * Returns null if no day in the next 8 days has a configured range.
     */
    internal fun computeNextBedtime(
        cfg: com.minded.minded.util.UserCfg,
        nowMs: Long,
    ): Long? {
        // If we're already inside any configured window (including yesterday's
        // cross-midnight window bleeding into today), fire the alarm now.
        if (SleepWindDownWindow.resolveNightId(cfg, nowMs) != null) {
            return nowMs + 5_000L
        }
        return computeNextFutureBedtime(cfg, nowMs)
    }

    /**
     * Like [computeNextBedtime] but never returns "fire now". Use after
     * posting the notification, when we want the *next* bedtime, not a
     * tight reschedule of the one that just fired.
     */
    internal fun computeNextFutureBedtime(
        cfg: com.minded.minded.util.UserCfg,
        nowMs: Long,
    ): Long? {
        val swd = cfg.sleepWindDown ?: return null
        @Suppress("UNCHECKED_CAST")
        val days = swd["days"] as? Map<String, Any?> ?: return null

        for (offset in 0..7) {
            val cal = Calendar.getInstance().apply {
                timeInMillis = nowMs
                add(Calendar.DATE, offset)
            }
            val dayIdx = (cal.get(Calendar.DAY_OF_WEEK) - 1).toString()
            val rangeMap = days[dayIdx] as? Map<*, *> ?: continue
            val startStr = rangeMap["start"] as? String ?: continue
            val endStr = rangeMap["end"] as? String ?: continue
            val startMin = SleepWindDownWindow.parseHHMM(startStr) ?: continue
            val endMin = SleepWindDownWindow.parseHHMM(endStr) ?: continue
            if (startMin == endMin) continue

            cal.set(Calendar.HOUR_OF_DAY, startMin / 60)
            cal.set(Calendar.MINUTE, startMin % 60)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)

            if (cal.timeInMillis > nowMs) return cal.timeInMillis
        }
        return null
    }
}

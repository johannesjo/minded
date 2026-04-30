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
 * even if the user hasn't unlocked the phone." The unlock receiver is a
 * complementary path for users who do unlock during the window.
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

    /** Schedule the next alarm given the user's current cfg. No-op if disabled. */
    fun scheduleNext(context: Context) {
        val cfg = SharedPreferenceService(context).getSyncData().cfg
        if (cfg.sleepWindDown == null) {
            cancel(context)
            return
        }
        val enabled = cfg.sleepWindDown["enabled"] as? Boolean ?: false
        if (!enabled || !cfg.isOnboardingComplete) {
            cancel(context)
            return
        }
        val nextMs = computeNextBedtime(cfg, System.currentTimeMillis())
        if (nextMs == null) {
            Log.d(TAG, "No future bedtime found in next 8 days")
            cancel(context)
            return
        }
        scheduleAt(context, nextMs)
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
     * Find the next configured bedtime at or after `nowMs`. Walks up to 8
     * days forward (covers the case where the user disables every day except
     * one on the same week).
     *
     * @return epoch ms of the next bedtime, or null if no day in the next
     *   week has a configured range.
     */
    internal fun computeNextBedtime(
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
            val startMin = parseHHMM(startStr) ?: continue
            val endMin = parseHHMM(endStr) ?: continue
            if (startMin == endMin) continue

            cal.set(Calendar.HOUR_OF_DAY, startMin / 60)
            cal.set(Calendar.MINUTE, startMin % 60)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)

            if (cal.timeInMillis >= nowMs) return cal.timeInMillis

            // For today, the bedtime may already be in the past — but the
            // window may still be active (e.g. start was 22:00, now is
            // 22:30); in that case fire immediately + a few seconds so the
            // alarm fires once we return.
            if (offset == 0) {
                val nowCal = Calendar.getInstance().apply { timeInMillis = nowMs }
                val nowMin = nowCal.get(Calendar.HOUR_OF_DAY) * 60 +
                    nowCal.get(Calendar.MINUTE)
                val insideSameDay = endMin > startMin && nowMin in startMin until endMin
                val insideCrossMidnight = endMin < startMin && nowMin >= startMin
                if (insideSameDay || insideCrossMidnight) {
                    return nowMs + 5_000L
                }
            }
            // Otherwise keep walking forward to the next day's bedtime.
        }
        return null
    }

    private fun parseHHMM(s: String): Int? {
        val m = Regex("""^(\d{1,2}):(\d{2})$""").matchEntire(s.trim()) ?: return null
        val h = m.groupValues[1].toInt()
        val mm = m.groupValues[2].toInt()
        if (h !in 0..23 || mm !in 0..59) return null
        return h * 60 + mm
    }
}

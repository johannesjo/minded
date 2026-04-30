package com.minded.minded.sleepwinddown

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.minded.minded.data.SharedPreferenceService

/**
 * Fires when the bedtime alarm scheduled by [SleepWindDownAlarmScheduler]
 * goes off. Posts the wind-down notification (subject to dismiss/snooze
 * gating), then schedules the next night.
 *
 * Also handles `BOOT_COMPLETED` so the alarm survives device reboots.
 */
class SleepWindDownAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        try {
            when (intent?.action) {
                Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_LOCKED_BOOT_COMPLETED -> {
                    SleepWindDownAlarmScheduler.scheduleNext(context)
                    return
                }
            }

            val sp = SharedPreferenceService(context)
            val syncData = sp.getSyncData()

            if (!syncData.cfg.isOnboardingComplete) {
                Log.d(TAG, "Onboarding incomplete, skipping wind-down")
                return
            }

            val nightId = SleepWindDownWindow.resolveNightId(syncData.cfg)
            if (nightId == null) {
                Log.d(TAG, "Outside wind-down window")
                SleepWindDownAlarmScheduler.scheduleNext(context)
                return
            }
            if (syncData.sleepWindDownDismissedNightId == nightId) {
                Log.d(TAG, "Already dismissed for night $nightId")
                SleepWindDownAlarmScheduler.scheduleNext(context)
                return
            }
            if (syncData.sleepWindDownSnoozeUntilTS > System.currentTimeMillis()) {
                Log.d(TAG, "Snoozed; rescheduling")
                SleepWindDownAlarmScheduler.scheduleAt(
                    context,
                    syncData.sleepWindDownSnoozeUntilTS
                )
                return
            }

            SleepWindDownNotifier.show(context)
            SleepWindDownAlarmScheduler.scheduleNext(context)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to handle alarm", e)
        }
    }

    companion object {
        private const val TAG = "SleepWindDownAlarm"
    }
}

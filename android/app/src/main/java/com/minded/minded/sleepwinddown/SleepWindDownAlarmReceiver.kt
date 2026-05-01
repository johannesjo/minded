package com.minded.minded.sleepwinddown

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.minded.minded.data.SharedPreferenceService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Fires when the bedtime alarm scheduled by [SleepWindDownAlarmScheduler]
 * goes off. Posts the wind-down notification (subject to dismiss/snooze
 * gating), then schedules the next night.
 *
 * Also handles `BOOT_COMPLETED` so the alarm survives device reboots.
 *
 * The work runs off the broadcast main thread via `goAsync()` because
 * `SharedPreferenceService.getSyncData()` deserializes JSON, which on a
 * cold-start phone with a large prefs blob can edge into the broadcast
 * 10-second budget and ANR.
 */
class SleepWindDownAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        val pendingResult = goAsync()
        val action = intent?.action
        scope.launch {
            try {
                handle(context, action)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to handle alarm", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun handle(context: Context, action: String?) {
        if (action == Intent.ACTION_BOOT_COMPLETED) {
            SleepWindDownAlarmScheduler.scheduleNext(context)
            return
        }

        val syncData = SharedPreferenceService(context).getSyncData()

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
        // Reschedule for the *next* bedtime (not the current one we just
        // fired on) — otherwise computeNextBedtime would return now+5s
        // again and we'd post the heads-up every 5 seconds.
        val nextStrict = SleepWindDownAlarmScheduler
            .computeNextFutureBedtime(syncData.cfg, System.currentTimeMillis())
        if (nextStrict != null) {
            SleepWindDownAlarmScheduler.scheduleAt(context, nextStrict)
        } else {
            SleepWindDownAlarmScheduler.cancel(context)
        }
    }

    companion object {
        private const val TAG = "SleepWindDownAlarm"
        private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    }
}

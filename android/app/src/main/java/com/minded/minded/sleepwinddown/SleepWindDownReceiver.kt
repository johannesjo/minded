package com.minded.minded.sleepwinddown

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.minded.minded.data.SharedPreferenceService

/**
 * Fires on `Intent.ACTION_USER_PRESENT` (keyguard dismissed after unlock).
 * If the configured sleep wind-down window is active and the user hasn't
 * dismissed/snoozed for tonight, posts the wind-down notification.
 *
 * The notification is the universal surfacing primitive — see
 * [SleepWindDownNotifier]. Going through the notification channel rather
 * than calling `startActivity` directly avoids Android 10+ background-
 * activity-start restrictions.
 *
 * Registered dynamically by `MyAccessibilityService` because
 * `ACTION_USER_PRESENT` cannot be declared statically on Android 8+.
 */
class SleepWindDownReceiver : BroadcastReceiver() {
    companion object {
        // Kept for backwards compatibility — older code paths and any
        // launcher PendingIntents still reference this extra.
        const val EXTRA_OPEN_SLEEP_WIND_DOWN =
            SleepWindDownNotifier.EXTRA_OPEN_SLEEP_WIND_DOWN
        private const val TAG = "SleepWindDownReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        if (intent?.action != Intent.ACTION_USER_PRESENT) return

        try {
            val sp = SharedPreferenceService(context)
            val syncData = sp.getSyncData()

            if (!syncData.cfg.isOnboardingComplete) {
                Log.d(TAG, "Onboarding incomplete, skipping wind-down")
                return
            }

            val nightId = SleepWindDownWindow.resolveNightId(syncData.cfg)
                ?: run {
                    Log.d(TAG, "Outside wind-down window")
                    return
                }

            if (syncData.sleepWindDownDismissedNightId == nightId) {
                Log.d(TAG, "Already dismissed for night $nightId")
                return
            }
            if (syncData.sleepWindDownSnoozeUntilTS > System.currentTimeMillis()) {
                Log.d(TAG, "Snoozed until ${syncData.sleepWindDownSnoozeUntilTS}")
                return
            }

            Log.d(TAG, "Posting wind-down notification for night $nightId")
            SleepWindDownNotifier.show(context)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to handle USER_PRESENT", e)
        }
    }
}

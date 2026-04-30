package com.minded.minded.sleepwinddown

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.minded.minded.MainActivity
import com.minded.minded.data.SharedPreferenceService

/**
 * Fires on `Intent.ACTION_USER_PRESENT` (keyguard dismissed after unlock).
 * If the configured sleep wind-down window is active and the user hasn't
 * dismissed/snoozed for tonight, brings up the minded app at the wind-down route.
 *
 * Registered dynamically by [MyAccessibilityService] — `ACTION_USER_PRESENT`
 * cannot be declared statically in the manifest on Android 8+.
 */
class SleepWindDownReceiver : BroadcastReceiver() {
    companion object {
        const val EXTRA_OPEN_SLEEP_WIND_DOWN = "openSleepWindDown"
        private const val TAG = "SleepWindDownReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        if (intent?.action != Intent.ACTION_USER_PRESENT) return

        try {
            val sp = SharedPreferenceService(context)
            val syncData = sp.getSyncData()

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

            Log.d(TAG, "Launching wind-down for night $nightId")
            val launch = Intent(context, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
                putExtra(EXTRA_OPEN_SLEEP_WIND_DOWN, true)
            }
            context.startActivity(launch)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to handle USER_PRESENT", e)
        }
    }
}

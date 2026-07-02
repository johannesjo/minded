package com.minded.minded

import android.app.Application
import android.app.UiModeManager
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.minded.minded.util.isDarkModeNow

/**
 * Registers the app's clock-based dark mode (19:00–06:00, see [isDarkModeNow])
 * with the system so the cold-start *starting window* arrives in the right
 * time-of-day state instead of flashing the light sky then swapping (issue #117).
 *
 * The starting window is drawn by the system from static theme resources before
 * any activity code runs, so nothing inside [MainActivity] can influence that
 * first frame. Dark mode here is deliberately decoupled from the system night
 * setting, so a plain `values-night` set (keyed to the system mode) would not
 * match. [UiModeManager.setApplicationNightMode] (API 31+) is the one lever that
 * does: it drives the app's *own* night qualifier from our clock, and the system
 * both resolves `values-night-v31` for the starting window and persists the
 * choice for the next cold start.
 *
 * Because the system paints the starting window from the *previously* persisted
 * value, the first launch immediately after a 19:00/06:00 boundary can still be
 * one frame stale; every subsequent launch within the phase is correct. On API
 * < 31 there is no per-app override, so those devices keep the prior behaviour
 * (MainActivity's onCreate swap corrects the activity window; the starting
 * window still flashes light at night — unavoidable without the override).
 */
class MindedApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            applyClockBasedNightMode()
        }
    }

    @RequiresApi(Build.VERSION_CODES.S)
    private fun applyClockBasedNightMode() {
        val mode =
            if (isDarkModeNow()) UiModeManager.MODE_NIGHT_YES
            else UiModeManager.MODE_NIGHT_NO
        try {
            getSystemService(UiModeManager::class.java)?.setApplicationNightMode(mode)
        } catch (e: Exception) {
            // Purely cosmetic (only the cold-start sky); never let it break launch.
            Log.w("MindedApplication", "setApplicationNightMode failed", e)
        }
    }
}

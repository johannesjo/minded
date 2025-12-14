package com.minded.minded.overlay

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.LittleSun
import java.time.Instant

//val SMALL_MSG_CYCLE_DURATION = 6

val SMALL_MSG_CYCLE_DURATION = 240
val REQUESTION_CYCLE_DURATION_IN_S = SMALL_MSG_CYCLE_DURATION * 10

@Suppress("DEPRECATION")
class LittleSunWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY
    override val logTag = javaClass.simpleName
    private var initialTime = 0
    private val powerManager: PowerManager =
        ctrlSvc.getSystemService(Context.POWER_SERVICE) as PowerManager

    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            val initialTime = sharedOverlayViewModel.getCurrentAppDuration()
            startTimer(initialTime)
        }

        LittleSun(elapsedSeconds, onSunTap = {
            Log.v(logTag, "onSunTap() - ending session and going to minded app")
            hideWindow()
            ctrlSvc.clearSession()
            ctrlSvc.goToApp()
        })
    }

    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
            val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
            val activeTimer = sharedOverlayViewModel.sharedData.value.activeTimer
            val appEntry = if (currentApp != null) sharedOverlayViewModel.sharedData.value.appMap[currentApp] else null
            
            val endTime = if (activeTimer != null) Instant.ofEpochMilli(activeTimer.endTS) else appEntry?.sessionEndTime
            val now = Instant.now()

            Log.v(
                logTag,
                "elapsedSeconds: $elapsedSeconds ${powerManager.isScreenOn} ${powerManager.isInteractive}"
            )

            if (endTime != null) {
                if (now.isAfter(endTime)) {
                    // Time limit reached
                    hideWindow()
                    // Clear the session limit
                    ctrlSvc.clearSession()
                    // actually checkToShowOverlay will handle it if we just trigger it
                    if (currentApp != null) {
                        OverlayControllerService.showOverlay(
                            ctrlSvc,
                            OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY,
                            OverlayControllerService.Companion.OverlayMode.INTERACTION_OVERLAY__FRESH,
                            currentApp
                        )
                    }
                    stopTimer()
                    return
                } else {
                    val remaining = java.time.Duration.between(now, endTime).seconds.toInt()
                    // If more than 12 hours (e.g. Rest of Day), show count-up timer
                    if (remaining > 12 * 3600) {
                        // Count-up mode for rest-of-day sessions
                        elapsedSeconds++
                        sharedOverlayViewModel.updateCurrentAppSessionDuration(elapsedSeconds)
                    } else {
                        // Countdown mode for timed sessions
                        elapsedSeconds = remaining
                    }
                }
            } else {
                // Regular elapsed time mode (fallback)
                elapsedSeconds++
                sharedOverlayViewModel.updateCurrentAppSessionDuration(elapsedSeconds)
            }

            // Always continue the timer - OverlayControllerService handles screen state changes
            // via its broadcast receiver. We just skip updates when screen is off.
            if (powerManager.isScreenOn && powerManager.isInteractive) {
                // Normal operation - screen is on and interactive
            } else {
                // Screen off or not interactive - skip this tick but keep timer running
                Log.v(logTag, "Screen off/not interactive, skipping timer tick")
            }

            // Always schedule next tick to keep timer alive
            handler.postDelayed(this, 1000)
        }
    }

    override fun showWindow() {
        Log.d(logTag, "showWindow() called for Little Sun")
        super.showWindow()
        // Make background transparent for the little sun overlay
        window?.setBackgroundColor(0x00000000)
        Log.d(logTag, "showWindow() completed, window=${window != null}")
    }

    override fun hideWindow() {
        super.hideWindow()
        stopTimer()
    }

    private fun startTimer(initialTimeI: Int = 0) {
        Log.v(logTag, "startTimer(${initialTimeI})")
        initialTime = if (initialTimeI > 0) initialTimeI else 0
        stopTimer()
        elapsedSeconds = initialTime
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }
}


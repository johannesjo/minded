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
            Log.v(logTag, "onSunTap() - ending session and showing intervention")
            hideWindow()
            ctrlSvc.clearSession()
            val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
            if (currentApp != null) {
                OverlayControllerService.showOverlay(
                    ctrlSvc,
                    OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY,
                    OverlayControllerService.Companion.OverlayMode.INTERACTION_OVERLAY__FRESH,
                    currentApp
                )
            }
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

            if (!powerManager.isScreenOn || !powerManager.isInteractive) {
                hideWindow()
                // go to homescreen directly to prevent showing the overlay after screen is turned on
                ctrlSvc.goToHomeScreen()
            } else {
//                Log.v(
//                    logTag,
//                    "elapsedSeconds: $elapsedSeconds + $initialTime) % $REQUESTION_CYCLE_DURATION_IN_S == 0 ${(elapsedSeconds + initialTime) % REQUESTION_CYCLE_DURATION_IN_S == 0}"
//                )
//                if ((elapsedSeconds + initialTime) % REQUESTION_CYCLE_DURATION_IN_S == 0 && isWindowShown() && elapsedSeconds > 0) {
//                    hideWindow()
//                    OverlayControllerService.showOverlay(
//                        ctrlSvc,
//                        OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY,
//                        OverlayControllerService.Companion.OverlayMode.INTERACTION_OVERLAY__FRESH,
//                        sharedOverlayViewModel.sharedData.value.currentApp
//                    )
//                } else
//                if (sharedOverlayViewModel.sharedData.value.lastQuestionForPrompt != null && (elapsedSeconds + initialTime) % SMALL_MSG_CYCLE_DURATION == 0 && isWindowShown() && elapsedSeconds > 0) {
//                    OverlayControllerService.showOverlay(
//                        ctrlSvc,
//                        OverlayControllerService.Companion.OverlayName.SMALL_MSG_OVERLAY
//                    )
//                }
                // restart timer
                handler.postDelayed(this, 1000)
            }
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


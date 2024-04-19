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
import com.minded.minded.ui.compose.AfterSun

//val AFTER_SUN_CYCLE_DURATION_IN_S = 6
val AFTER_SUN_CYCLE_DURATION_IN_S = 240
val RE_MIND_CYCLE_DURATION = AFTER_SUN_CYCLE_DURATION_IN_S * 4

@Suppress("DEPRECATION")
class AfterSunWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY
    override val logTag = javaClass.simpleName
    private val powerManager: PowerManager =
        ctrlSvc.getSystemService(Context.POWER_SERVICE) as PowerManager

    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            val initialTime = sharedOverlayViewModel.getCurrentAppDuration()
            startTimer(initialTime)
        }

        AfterSun(elapsedSeconds, onSunTap = {
            Log.v(logTag, "onSunTap()")
            ctrlSvc.userDrivenClose();
            hideWindow()
        })
    }

    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
            Log.v(
                logTag,
                "elapsedSeconds: $elapsedSeconds ${powerManager.isScreenOn} ${powerManager.isInteractive}"
            )
            elapsedSeconds++
            sharedOverlayViewModel.updateCurrentAppSessionDuration(elapsedSeconds)

            if (!powerManager.isScreenOn || !powerManager.isInteractive) {
                hideWindow()
                // go to homescreen directly to prevent showing the overlay after screen is turned on
                ctrlSvc.goToHomeScreen()
            } else {
                if (elapsedSeconds % RE_MIND_CYCLE_DURATION == 0 && isWindowShown() && elapsedSeconds > 0) {
                    hideWindow()
                    OverlayControllerService.showOverlay(
                        ctrlSvc,
                        OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY,
                        OverlayControllerService.Companion.OverlayMode.QUESTION_OVERLAY__FRESH,
                        sharedOverlayViewModel.sharedData.value.currentApp
                    )
                } else if (elapsedSeconds % AFTER_SUN_CYCLE_DURATION_IN_S == 0 && isWindowShown() && elapsedSeconds > 0) {
                    OverlayControllerService.showOverlay(
                        ctrlSvc,
                        OverlayControllerService.Companion.OverlayName.REMINDER_MSG_OVERLAY
                    )
                }
                // restart timer
                handler.postDelayed(this, 1000)
            }
        }
    }

    override fun hideWindow() {
        super.hideWindow()
        stopTimer()
    }

    private fun startTimer(initialTime: Int = 0) {
        Log.v(logTag, "startTimer(${initialTime})")
        stopTimer()
        elapsedSeconds = initialTime
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }
}


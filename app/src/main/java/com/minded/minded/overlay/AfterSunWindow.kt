package com.minded.minded.overlay

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.AfterSun

val AFTER_SUN_CYCLE_DURATION_IN_S = 7

@Suppress("DEPRECATION")
class AfterSunWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY
    override val logTag = javaClass.simpleName

    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            startTimer()
        }

        AfterSun(elapsedSeconds, onSunTap = {
            Log.v(logTag, "onSunTap()")
            ctrlSvc.userDrivenClose();
            hideWindow()
            sharedOverlayViewModel.updateSharedData(
                sunTxt = "Welcome back!",
                isShowAfterSunAfterSuccess = false
            )
            OverlayControllerService.showOverlay(
                window!!.context,
                OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY
            )
        })
    }

    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
//            Log.v(logTag, "elapsedSeconds: $elapsedSeconds")
            elapsedSeconds++
            handler.postDelayed(this, 1000)
            if (elapsedSeconds % AFTER_SUN_CYCLE_DURATION_IN_S == 0 && isWindowShown() && elapsedSeconds > 0) {
                OverlayControllerService.showOverlay(
                    window!!.context,
                    OverlayControllerService.Companion.OverlayName.REMINDER_MSG_OVERLAY
                )
            }
        }
    }

//    override fun hideOverlay() {
//        super.hideOverlay()
//        ReMinderMsgWindow.hideOverlay(this)
//        stopTimer()
//    }

    private fun startTimer() {
        Log.v(logTag, "startTimer()")
        stopTimer()
        elapsedSeconds = 0
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }

}


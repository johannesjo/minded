package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.view.WindowManager
import androidx.compose.runtime.Composable
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.InteractionOverlayBig
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


class InteractionWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
//    private val dashboardViewModel: DashboardViewModel,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY

    override val logTag = javaClass.simpleName


    @Composable
    override fun Cmp() {
        InteractionOverlayBig(
            mode = "MOOD",
            sharedOverlayViewModel = sharedOverlayViewModel,
            onSuccess = {
                OverlayControllerService.showOverlay(
                    ctrlSvc,
                    OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY
                )
                hideWindow()
                GlobalScope.launch {
                    delay(1000)  // delay for 1000 milliseconds (1 second)
                    hideWindow()
                }
            },
            onSkip = {
                sharedOverlayViewModel.resetAnswerTxt()
                OverlayControllerService.showOverlay(
                    ctrlSvc,
                    OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
                )
                hideWindow()
            }
        )
    }


    override fun getLayoutParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION") return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT
        )
    }
}


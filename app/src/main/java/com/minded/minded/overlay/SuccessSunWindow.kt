package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.SuccessSun


open class SuccessSunWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY

    override val logTag = javaClass.simpleName

    private val defaultSunTxt = "tap sun to close"


    @Composable
    override fun Cmp() {
        val sharedData by sharedOverlayViewModel.sharedData.collectAsState()

        SuccessSun(
            sharedData.sunTxt ?: defaultSunTxt,
            onAfterTapSun = {
                Log.v(logTag, "onTapSun()")
                ctrlSvc.userDrivenClose();
                hideWindow()
            },
            onAfterShow = {
                Log.v(logTag, "onAfterShow()")
                if (sharedData.isShowAfterSunAfterSuccess) {
                    OverlayControllerService.showOverlay(
                        ctrlSvc,
                        OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
                    )
//                } else {
//                    OverlayControllerService.hideOverlay(
//                        ctrlSvc,
//                        OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
//                    )
                }
                hideWindow()
            })
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


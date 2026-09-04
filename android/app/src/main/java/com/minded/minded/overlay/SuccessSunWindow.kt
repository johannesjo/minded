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
    override val logTag = javaClass.simpleName

    private val defaultSunTxt = "tap sun to close"


    @Composable
    override fun Cmp() {
        val sharedData by sharedOverlayViewModel.sharedData.collectAsState()

        SuccessSun(
            sharedData.successSunTxt ?: defaultSunTxt,
            inDuration = 1000,
            onSunTap = {
                Log.v(logTag, "onSunTap()")
                ctrlSvc.userDrivenClose(isSkipShowSuccessSunAfter = true);
            },
            onAfterTapSun = {
                Log.v(logTag, "onAfterTapSun()")
                hideWindow()
            },
            onAfterShow = {
                Log.v(logTag, "onAfterShow()")
//                if (sharedData.isShowLittleSunAfterSuccess) {
//                    OverlayControllerService.showOverlay(
//                        ctrlSvc,
//                        OverlayControllerService.Companion.OverlayName.LITTLE_SUN_OVERLAY
//                    )
//                }
                hideWindow()
            })
    }


    override fun getLayoutParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION") return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN or
                    WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS,
            PixelFormat.TRANSLUCENT
        ).apply {
            x = 0
            y = 0
            // Draw under the system bars - including the bottom gesture /
            // navigation bar - so the success gradient covers the full screen
            // with no uncovered strip. Same opt-out the intervention and
            // wind-down windows use: on API 30+ the window keeps clear of the
            // system-bar insets unless told otherwise, and FLAG_FULLSCREEN alone
            // is inert on modern Android.
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                fitInsetsTypes = 0
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

}


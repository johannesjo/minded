package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import com.minded.minded.ui.compose.SuccessSun


class SuccessSunWindow(
    private val ctrlSvc: OverlayControllerService,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY

    override val logTag = javaClass.simpleName

    private val defaultSunTxt = "tap sun to close"
    private var text: String = defaultSunTxt
    private var isShowAfterSunAfter: Boolean = false


    @Composable
    override fun Cmp() {
        SuccessSun(text,
            onAfterTapSun = {
                Log.v(logTag, "onTapSun()")
                userDrivenClose();
            },
            onAfterShow = {
                Log.v(logTag, "onAfterShow()")
                if (isShowAfterSunAfter) {
                    OverlayControllerService.showOverlay(
                        window!!.context,
                        OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
                    )
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


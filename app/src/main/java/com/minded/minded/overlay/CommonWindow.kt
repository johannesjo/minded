package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.minded.minded.overlay.data.SharedOverlayViewModel

open class CommonWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager
) {
    open val logTag = javaClass.simpleName
    var window: View? = null

    fun isWindowShown(): Boolean {
        return window != null
    }


    @Composable
    open fun Cmp() {
    }

    fun showWindow() {
        if (window != null) {
            Log.v(logTag, "overlay already shown - aborting")
            return
        }
        window = ComposeView(ctrlSvc).apply {
            setViewTreeLifecycleOwner(ctrlSvc)
            setViewTreeSavedStateRegistryOwner(ctrlSvc)
            setContent {
                // NOTE: theme wont work since it's not an activity
                //                MindedTheme {
                Cmp()
            }
        }
        windowManager.addView(window, getLayoutParams())
    }


    open fun hideWindow() {
        Log.v(
            logTag, "hideOverlay()"
        )
        if (window == null) {
            Log.v(
                logTag, "overlay not shown - aborting"
            )
            return
        }
        windowManager.removeView(window)
        window = null

    }

    open fun getLayoutParams(): WindowManager.LayoutParams {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_BLUR_BEHIND, // Add FLAG_NOT_FOCUSABLE
            PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.START or android.view.Gravity.BOTTOM
        return params;
    }
}

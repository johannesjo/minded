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
    private var isHiding = false

    fun isWindowShown(): Boolean {
        return window != null
    }


    @Composable
    open fun Cmp() {
    }

    open fun showWindow() {
        if (window != null) {
            Log.v(logTag, "overlay already shown - aborting")
            return
        }
        isHiding = false
        window = ComposeView(ctrlSvc).apply {
            setViewTreeLifecycleOwner(ctrlSvc)
            setViewTreeSavedStateRegistryOwner(ctrlSvc)
            // Set dark background to prevent white flashes
            setBackgroundColor(0xFF1a1a1a.toInt())
            setContent {
                // NOTE: theme wont work since it's not an activity
                //                MindedTheme {
                Cmp()
            }
        }
        windowManager.addView(window, getLayoutParams())
        // Fade in animation
        window?.alpha = 0f
        window?.animate()
            ?.alpha(1f)
            ?.setDuration(300)
            ?.start()
    }


    open fun hideWindow() {
        Log.v(
            logTag, "hideWindow() wasWindowShown ${window != null} isHiding $isHiding"
        )
        if (window == null || isHiding) {
            return
        }
        isHiding = true
        // Fade out animation
        window?.animate()
            ?.alpha(0f)
            ?.setDuration(300)
            ?.withEndAction {
                window?.let { view ->
                    windowManager.removeView(view)
                }
                window = null
                isHiding = false
            }
            ?.start()
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

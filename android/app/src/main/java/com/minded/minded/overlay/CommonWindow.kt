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

    /**
     * True while hideWindow()'s fade-out animation is in flight (the view has not
     * been removed yet). Subclasses that start their own animation on [window]
     * must check this first: starting a second ViewPropertyAnimator on the same
     * view cancels the fade-out's withEndAction, so the view would never be
     * removed and the window would wedge open. Safe to read on the main thread.
     */
    protected fun isWindowHiding(): Boolean = isHiding

    /**
     * Duration of the native window alpha fade-in. While the window animates
     * from alpha 0 -> 1 it is semi-transparent, so whatever is behind it (e.g.
     * the blocked app the user just opened) shows through for this long.
     * Overlays that cover a tempting app should set this to 0 so the shield is
     * opaque the instant it is added and nothing shows through; the graceful
     * appearance then happens in the web content that fades in on top.
     */
    open val fadeInDurationMs: Long = 300L

    fun isWindowShown(): Boolean {
        return window != null
    }


    @Composable
    open fun Cmp() {
    }

    open fun showWindow() {
        synchronized(this) {
            if (window != null || isHiding) {
                Log.v(logTag, "overlay already shown or hiding - aborting (window=${window != null}, isHiding=$isHiding)")
                return
            }
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
            if (fadeInDurationMs > 0L) {
                // Fade in animation
                window?.alpha = 0f
                window?.animate()
                    ?.alpha(1f)
                    ?.setDuration(fadeInDurationMs)
                    ?.start()
            } else {
                // Show fully opaque immediately so the blocked app is never
                // visible through a semi-transparent overlay while it fades in.
                window?.alpha = 1f
            }
        }
    }


    open fun hideWindow() {
        synchronized(this) {
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
                    synchronized(this) {
                        window?.let { view ->
                            try {
                                windowManager.removeView(view)
                            } catch (e: Exception) {
                                Log.e(logTag, "Failed to remove view", e)
                            }
                        }
                        onWindowRemoved()
                        window = null
                        isHiding = false
                    }
                }
                ?.start()
        }
    }

    /** Called after the window view has been removed from the window manager. */
    protected open fun onWindowRemoved() {}

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

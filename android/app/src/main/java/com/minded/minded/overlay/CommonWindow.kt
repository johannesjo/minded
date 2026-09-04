package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
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
    companion object {
        // How long to keep nudging a freshly-loaded overlay WebView to paint its
        // first frame. Long enough to bridge the gap until the web content's own
        // fade-in animation starts driving frames, short enough to add no
        // meaningful battery/CPU cost.
        private const val FIRST_FRAME_PUMP_MS = 800L

        // Duration of the near-opaque window alpha nudge that forces the overlay
        // window to recomposite its first frame after load.
        private const val FIRST_FRAME_ALPHA_NUDGE_MS = 200L
    }

    open val logTag = javaClass.simpleName
    var window: View? = null
    private var isHiding = false

    /**
     * Run [block] on the live window root, but only while no hideWindow()
     * fade-out is in flight - holding the same lock hideWindow() takes, so the
     * "is a hide running?" check and [block] are atomic against it. A subclass
     * that animates [window] must go through here: starting a second
     * ViewPropertyAnimator on the same view cancels the fade-out's withEndAction,
     * so the view is never removed and the window wedges open permanently
     * (isHiding never resets either). hideWindow() can be invoked off the main
     * thread (e.g. from the WebView JS-bridge thread), so a plain unsynchronized
     * isHiding check would not actually close that race. Keep [block] short - it
     * runs under the lock; starting an animation is fine since that only posts to
     * the UI thread.
     */
    protected fun withWindowUnlessHiding(block: (View) -> Unit) {
        synchronized(this) {
            if (isHiding) return
            val root = window ?: return
            block(root)
        }
    }

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
                // Painted before addView, so the very first frame is already
                // the right surface (see paintInitialShield).
                paintInitialShield(this)
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

    /**
     * Paint the window root's own background before it is added to the window
     * manager, so its very first frame is already the right surface. The default
     * is a flat dark ground (prevents white flashes). Full-screen overlays that
     * cover a blocked app override this with the clock-matched loading sky, so
     * the entry beat is "the sky arrives" - never "dark flash, then sky" (#118).
     */
    protected open fun paintInitialShield(root: View) {
        root.setBackgroundColor(0xFF1a1a1a.toInt())
    }

    /**
     * First-frame hardening for an overlay WebView shown with
     * [fadeInDurationMs] = 0. Run a near-opaque alpha animation on the overlay
     * window root after load: animating the window's alpha forces the
     * WindowManager to recomposite the overlay across several frames - the same
     * mechanism the fading overlays' fade-in relies on, and the strongest nudge
     * for a stuck first composite (the "black screen until I tap it" report).
     * The range is 0.996 -> 1.0, not 0 -> 1: visually imperceptible, so the
     * opaque-shield guarantee is preserved and the blocked app never shows
     * through.
     */
    protected fun nudgeWindowAlpha() {
        // Go through withWindowUnlessHiding so the "is a hide in flight?" check
        // and the animation start are atomic under hideWindow()'s lock: both
        // animate the same window view, so racing ours in would cancel the
        // fade-out's withEndAction and wedge the window open. hideWindow() can
        // fire off the main thread (a fast JS-bridge dismiss, or
        // onRenderProcessGone), so the guard must hold the lock - not merely
        // assume same-thread ordering.
        withWindowUnlessHiding { root ->
            root.alpha = 0.996f
            root.animate()
                .alpha(1f)
                .setDuration(FIRST_FRAME_ALPHA_NUDGE_MS)
                .start()
        }
    }

    /**
     * The other half of the first-frame hardening: re-post an invalidate on each
     * animation frame for a short window after the page loads, so the overlay
     * WebView is forced to schedule and present its first composite even though
     * no native fade animation is driving frames. The web content's own fade-in
     * (driven by JS a beat after load) takes over once it starts animating, so a
     * brief pump is enough to cover the gap. [isLive] stops the pump once the
     * window has moved on from [view] (a destroyed or replaced WebView).
     *
     * shortcut: this is the redundant half of the belt-and-suspenders
     * (nudgeWindowAlpha is the primary, window-level nudge). If a field repro
     * shows the alpha nudge alone fixes the black screen, delete this; if instead
     * the blind 800ms proves wasteful, gate it on WebView.postVisualStateCallback
     * so it stops at first paint instead of running a fixed duration.
     */
    protected fun pumpFirstFrame(view: WebView, isLive: () -> Boolean) {
        // Monotonic clock: a wall-clock jump (NTP / manual change) mid-pump must
        // not cut the burst short or stretch it out.
        val deadline = SystemClock.uptimeMillis() + FIRST_FRAME_PUMP_MS
        val pump = object : Runnable {
            override fun run() {
                if (!isLive()) return
                view.invalidate()
                if (SystemClock.uptimeMillis() < deadline) {
                    view.postOnAnimation(this)
                }
            }
        }
        view.postOnAnimation(pump)
    }

    /**
     * Tear the window down from the main thread after its WebView failed (a
     * main-frame load error, or a gone render process) - but only while that
     * WebView is still the live one per [liveView]: a delayed callback from a
     * disposed WebView must not tear down a newer window that already replaced
     * it. Without a teardown the user would be left on a dead overlay.
     */
    protected fun hideWindowForFailedWebView(failedView: WebView?, liveView: () -> WebView?) {
        val expectedView = failedView ?: liveView() ?: return
        Handler(Looper.getMainLooper()).post {
            if (liveView() === expectedView) {
                hideWindow()
            }
        }
    }

    /**
     * Remove the window NOW, with no fade-out, still firing [onWindowRemoved].
     * Same teardown as [hideWindow] minus the 300ms alpha animation.
     *
     * Used for the Little Sun → intervention hand-off on timer expiry: the fresh
     * intervention overlay is shown right after (gated on this window being gone,
     * via onWindowRemoved), and its opaque shield then covers this corner. A fade
     * here would just leave the corner empty / the blocked app flashing through
     * for those 300ms before the intervention appears - so drop the bubble at once
     * and let the shield take over as soon as possible.
     */
    open fun hideWindowImmediate() {
        synchronized(this) {
            if (window == null || isHiding) {
                return
            }
            isHiding = true
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

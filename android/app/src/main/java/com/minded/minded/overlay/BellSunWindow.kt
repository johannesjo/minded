package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.BELL_SUN_DISC_BOX
import com.minded.minded.ui.compose.BELL_SUN_HALO_BOX
import com.minded.minded.ui.compose.BellSunDisc
import com.minded.minded.ui.compose.BellSunHalo
import com.minded.minded.ui.compose.BellSunState
import kotlin.math.roundToInt

/**
 * The mindfulness bell's windows (#298), centred where the Little Sun rests -
 * the one place a sun already lives outside minded - so the bell never invents
 * a new spot on screen.
 *
 * Two windows, like the Little Sun and its leave zone: this window holds only
 * the disc, exactly the Little Sun bubble's size, and is the only part that
 * takes a touch (a tap lets the sun go sooner). The spreading halo lives in a
 * second window beneath it that is never touchable, so the light can sit over
 * the user's app without ever catching a finger meant for it. Neither paints a
 * sky - a sky would cover the app and turn a soft bell into a wall - and
 * neither is focusable, so the keyboard stays with the app underneath.
 */
class BellSunWindow(
    private val ctrlSvc: OverlayControllerService,
    sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    override val logTag = javaClass.simpleName

    /** How long the strike rings - the swell fades over exactly this. Set per show. */
    var decayMs: Int = DEFAULT_DECAY_MS

    /** Fired once, at the strike: the controller plays the sound / haptic. */
    var onStrike: () -> Unit = {}

    /** Fired once the bell is gone, however it went (faded, tapped, taken over). */
    var onGone: () -> Unit = {}

    private var state = BellSunState()
    private var haloView: ComposeView? = null
    private var discX = 0
    private var discY = 0

    @Composable
    override fun Cmp() {
        BellSunDisc(
            state = state,
            decayMs = decayMs,
            onStrike = { onStrike() },
            // The sun has already faded out; the base fade is a no-op by now.
            onGone = { hideWindow() },
        )
    }

    override fun showWindow() {
        if (isWindowShown()) return
        state = BellSunState()
        initPosition()
        // The halo first, so the disc's window stacks above it.
        showHalo()
        super.showWindow()
    }

    override fun hideWindow() {
        // The halo has no window fade of its own; ease it out with the disc.
        haloView?.animate()?.alpha(0f)?.setDuration(300)?.start()
        super.hideWindow()
    }

    override fun onWindowRemoved() {
        removeHalo()
        onGone()
    }

    /** The composable carries the entrance - no extra window alpha fade on top. */
    override val fadeInDurationMs: Long = 0L

    /** Transparent from the first frame: the bell stands on the user's app. */
    override fun paintInitialShield(root: View) {
        root.setBackgroundColor(0x00000000)
    }

    private fun initPosition() {
        val saved = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
        val (x, y) = LittleSunPosition.restingTopLeft(ctrlSvc, windowManager, saved)
        discX = x
        discY = y
    }

    private fun showHalo() {
        val density = ctrlSvc.resources.displayMetrics.density
        val disc = (BELL_SUN_DISC_BOX.value * density).roundToInt()
        val halo = (BELL_SUN_HALO_BOX.value * density).roundToInt()
        val view = ComposeView(ctrlSvc).apply {
            setViewTreeLifecycleOwner(ctrlSvc)
            setViewTreeSavedStateRegistryOwner(ctrlSvc)
            setBackgroundColor(0x00000000)
            setContent { BellSunHalo(state) }
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = discX + disc / 2 - halo / 2
            y = discY + disc / 2 - halo / 2
        }
        try {
            windowManager.addView(view, params)
            haloView = view
        } catch (e: Exception) {
            // The disc still rings; only the spreading light is lost.
            Log.e(logTag, "Failed to add the bell's halo window", e)
        }
    }

    private fun removeHalo() {
        val view = haloView ?: return
        haloView = null
        try {
            windowManager.removeView(view)
        } catch (e: Exception) {
            Log.e(logTag, "Failed to remove the bell's halo window", e)
        }
    }

    override fun getLayoutParams(): WindowManager.LayoutParams {
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = discX
            y = discY
        }
    }

    companion object {
        /**
         * The single bell's decay when the real length can't be read - the same
         * value the web BELL practice falls back to
         * (SINGLE_BELL_FALLBACK_DURATION_MS in sunAudio.ts).
         */
        const val DEFAULT_DECAY_MS = 5500
    }
}

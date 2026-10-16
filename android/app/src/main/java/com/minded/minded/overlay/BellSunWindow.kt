package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.BELL_SUN_DISC_BOX
import com.minded.minded.ui.compose.BELL_SUN_HALO_BOX
import com.minded.minded.ui.compose.BellSunDisc
import com.minded.minded.ui.compose.BellSunHalo
import com.minded.minded.ui.compose.BellSunState
import kotlin.math.roundToInt

/**
 * A sun already on screen that the bell rings *through* rather than bringing a
 * second one (the one-sun rule): its centre and diameter in display pixels.
 */
data class BellHost(val centerX: Int, val centerY: Int, val diameterPx: Int, val kind: Kind) {
    enum class Kind { LITTLE_SUN, WIDGET }
}

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
 *
 * With a [host] (the Little Sun, or the widget's sun in view) the bell brings
 * no disc of its own: the light rises around that sun, and neither window
 * takes a touch, so the host stays exactly as it was.
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

    /** The sun this ring goes through, or null for the bell's own. Set per show. */
    var host: BellHost? = null

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
            showDisc = host == null,
        )
    }

    override fun showWindow() {
        if (isWindowShown()) return
        state = BellSunState()
        initPosition()
        // The halo first, so the disc's window stacks above it.
        showHalo()
        try {
            super.showWindow()
        } catch (e: Exception) {
            // The disc never appeared, so onWindowRemoved won't fire for it.
            removeHalo()
            throw e
        }
    }

    override fun hideWindow() {
        // Leaving from outside (taken over, screen off): a strike still to come
        // never comes - the bell doesn't ring over whatever replaced it.
        state.isLeaving = true
        // The halo has no window fade of its own; ease it out with the disc.
        haloView?.animate()?.alpha(0f)?.setDuration(300)?.start()
        super.hideWindow()
    }

    override fun onWindowRemoved() {
        removeHalo()
        host = null
        onGone()
    }

    /** The composable carries the entrance - no extra window alpha fade on top. */
    override val fadeInDurationMs: Long = 0L

    /** Transparent from the first frame: the bell stands on the user's app. */
    override fun paintInitialShield(root: View) {
        root.setBackgroundColor(0x00000000)
    }

    private fun initPosition() {
        val h = host
        if (h != null) {
            val disc = (BELL_SUN_DISC_BOX.value * ctrlSvc.resources.displayMetrics.density).roundToInt()
            discX = h.centerX - disc / 2
            discY = h.centerY - disc / 2
            return
        }
        val saved = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
        val (x, y) = LittleSunPosition.restingTopLeft(ctrlSvc, windowManager, saved)
        discX = x
        discY = y
    }

    private fun showHalo() {
        val density = ctrlSvc.resources.displayMetrics.density
        val disc = (BELL_SUN_DISC_BOX.value * density).roundToInt()
        // Around a host the light keeps the bell's own proportions to its sun,
        // so a large widget sun gets a halo that still reaches past its rim.
        val hostDiameter = host?.diameterPx
        val halo = maxOf(
            (BELL_SUN_HALO_BOX.value * density).roundToInt(),
            ((hostDiameter ?: 0) * BELL_SUN_HALO_BOX.value / BELL_SUN_DISC_BOX.value).roundToInt(),
        )
        val hostFraction = hostDiameter?.let { it.toFloat() / halo } ?: 0f
        val view = ComposeView(ctrlSvc).apply {
            setViewTreeLifecycleOwner(ctrlSvc)
            setViewTreeSavedStateRegistryOwner(ctrlSvc)
            setBackgroundColor(0x00000000)
            setContent { BellSunHalo(state, (halo / density).dp, hostFraction) }
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
            // Android 12+ blocks touches beneath another app's overlay - even a
            // not-touchable one - whose window alpha is above the maximum
            // obscuring opacity (0.8). At exactly that, taps on the app under
            // the light still land. BellSunHalo compensates in its colours.
            alpha = HALO_WINDOW_ALPHA
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
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                // Ringing through a host: every touch stays the host's.
                (if (host != null) WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE else 0),
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

        /** See showHalo(): the most a pass-through overlay may obscure. */
        const val HALO_WINDOW_ALPHA = 0.8f
    }
}

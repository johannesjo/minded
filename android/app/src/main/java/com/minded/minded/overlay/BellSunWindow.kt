package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.geometry.Offset
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.BellSun
import com.minded.minded.ui.compose.BellSunState

/**
 * A sun already on screen that the bell rings *through* rather than bringing a
 * second one (the one-sun rule): its centre and diameter in display pixels.
 */
data class BellHost(val centerX: Int, val centerY: Int, val diameterPx: Int, val kind: Kind) {
    enum class Kind { LITTLE_SUN, WIDGET }
}

/**
 * The mindfulness bell's window (#298), with its sun at the centre of the
 * screen - where the eyes already are after an unlock, and where an
 * intervention's own sun first appears, so a takeover hands off in place.
 * (It used to rest at the Little Sun's corner; among a home screen's icons it
 * read as one more icon.)
 *
 * One full-screen window holds everything - the sun, a light dim over the
 * rest of the screen, and the strike's light ([BellSun]) - and takes no touch
 * at all. The middle of the screen right after an unlock is exactly where a
 * finger is headed, and a bell that caught that tap would cost the user the
 * app they meant to open. It leaves on its own, so it needs no tap. It is not
 * focusable either, so the keyboard stays with the app underneath.
 *
 * With a [host] (the Little Sun, or the widget's sun in view) the bell brings
 * no disc of its own: the light leaves that sun's rim and the dim clears
 * around it, so the host stays as it was.
 */
class BellSunWindow(
    private val ctrlSvc: OverlayControllerService,
    sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    override val logTag = javaClass.simpleName

    /** How long the strike rings - the light fades over (the audible part of) this. Set per show. */
    var decayMs: Int = DEFAULT_DECAY_MS

    /** Fired once, at the strike: the controller plays the sound / haptic. */
    var onStrike: () -> Unit = {}

    /** Fired once the bell is gone, however it went (faded, taken over). */
    var onGone: () -> Unit = {}

    /** The sun this ring goes through, or null for the bell's own. Set per show. */
    var host: BellHost? = null

    private var state = BellSunState()
    private var center = Offset.Zero
    private var sunRadiusPx = 0f

    @Composable
    override fun Cmp() {
        BellSun(
            state = state,
            decayMs = decayMs,
            center = center,
            sunRadiusPx = sunRadiusPx,
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
        super.showWindow()
    }

    override fun hideWindow() {
        // Leaving from outside (taken over, screen off): a strike still to come
        // never comes - the bell doesn't ring over whatever replaced it.
        state.isLeaving = true
        super.hideWindow()
    }

    override fun onWindowRemoved() {
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
            center = Offset(h.centerX.toFloat(), h.centerY.toFloat())
            sunRadiusPx = h.diameterPx / 2f
            return
        }
        center = Offset(
            LittleSunPosition.displayWidthPx(ctrlSvc, windowManager) / 2f,
            LittleSunPosition.displayHeightPx(ctrlSvc, windowManager) / 2f,
        )
        sunRadiusPx = LittleSunPosition.bubbleSizePx(ctrlSvc.resources.displayMetrics.density) / 2f
    }

    override fun getLayoutParams(): WindowManager.LayoutParams {
        // Covers the whole display, in the same coordinates as the Little Sun
        // and the widget's bounds, so the dim reaches every edge.
        return WindowManager.LayoutParams(
            LittleSunPosition.displayWidthPx(ctrlSvc, windowManager),
            LittleSunPosition.displayHeightPx(ctrlSvc, windowManager),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            LittleSunPosition.placeInDisplay(ctrlSvc, windowManager, this, 0, 0)
            // Android 12+ blocks touches beneath another app's overlay - even a
            // not-touchable one - whose window alpha is above the maximum
            // obscuring opacity (0.8). At exactly that, taps on the app (or the
            // widget's sun) under the bell still land. BellSun compensates in
            // its colours; only the sun's body can't, and stays faintly
            // see-through - the price of never catching a tap. (The Little
            // Sun beneath is minded's own window, so it is never blocked.)
            alpha = WINDOW_ALPHA
        }
    }

    companion object {
        /**
         * The single bell's decay when the real length can't be read - the same
         * value the web BELL practice falls back to
         * (SINGLE_BELL_FALLBACK_DURATION_MS in sunAudio.ts).
         */
        const val DEFAULT_DECAY_MS = 5500

        /** See getLayoutParams(): the most a pass-through overlay may obscure. */
        const val WINDOW_ALPHA = 0.8f
    }
}

package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.BELL_SUN_BOX
import com.minded.minded.ui.compose.BellSun
import kotlin.math.roundToInt

/**
 * The mindfulness bell's window (#298): a small, wrap-content overlay holding
 * [BellSun], centred where the Little Sun rests - the one place a sun already
 * lives outside minded - so the bell never invents a new spot on screen.
 *
 * It paints no sky (a sky would cover the user's app and turn a soft bell into
 * a wall) and is never focusable, so it can't take the keyboard from the app
 * underneath; Android routes it only the touches inside its own small bounds,
 * where a tap lets the sun go sooner.
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

    private var posX = 0
    private var posY = 0

    @Composable
    override fun Cmp() {
        BellSun(
            decayMs = decayMs,
            onStrike = { onStrike() },
            // The composable has already faded the sun out; remove the window
            // with the base fade (a no-op visually by now).
            onGone = { hideWindow() },
        )
    }

    override fun showWindow() {
        if (!isWindowShown()) initPosition()
        super.showWindow()
    }

    /** The composable carries the entrance - no extra window alpha fade on top. */
    override val fadeInDurationMs: Long = 0L

    /** Transparent from the first frame: the bell stands on the user's app. */
    override fun paintInitialShield(root: View) {
        root.setBackgroundColor(0x00000000)
    }

    private fun initPosition() {
        val density = ctrlSvc.resources.displayMetrics.density
        val bubble = LittleSunPosition.bubbleSizePx(density)
        val box = (BELL_SUN_BOX.value * density).roundToInt()
        val saved = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
        val (x, y) = LittleSunPosition.restingTopLeft(ctrlSvc, windowManager, saved)
        posX = x + bubble / 2 - box / 2
        posY = y + bubble / 2 - box / 2
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
            x = posX
            y = posY
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

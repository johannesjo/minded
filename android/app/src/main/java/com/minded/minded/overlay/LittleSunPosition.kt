package com.minded.minded.overlay

import android.content.Context
import android.os.Build
import android.view.Gravity
import android.view.WindowInsets
import android.view.WindowManager
import kotlin.math.roundToInt

/**
 * Single source of truth for where the draggable Little Sun bubble rests on
 * screen.
 *
 * Shared by [LittleSunWindow] - which positions the actual overlay - and the
 * interaction WebView's departing-sun morph, which needs to know where the
 * bubble will appear so the gliding sun lands exactly there as it hands off to
 * the persistent timer (see InteractionWindowJavaScriptInterface
 * .getLittleSunRestCenter). Keeping the geometry here stops the two from
 * drifting: the bubble moved to a free-floating, draggable position (#51), so a
 * fixed corner is no longer where it rests.
 */
object LittleSunPosition {

    /**
     * The mini bubble (double-tap the Little Sun) is the same sun at this
     * scale, so it covers less of the app beneath. One sun, two sizes: it
     * shrinks/grows in place around the same centre.
     */
    const val MINI_SCALE = 0.5f

    /** The sun as drawn - its glow box - at full or mini size. */
    fun glowSizePx(density: Float, mini: Boolean = false): Int =
        (60 * (if (mini) MINI_SCALE else 1f) * density).roundToInt()

    /**
     * The bubble window (its touch area): always the full sun's glow box. The
     * mini sun only shrinks its disc inside it - the window never resizes, since
     * a window resize + move isn't synced with the redraw and shows the old
     * frame at the new position for a frame (a jiggle as it reaches mini).
     */
    fun bubbleSizePx(density: Float): Int = glowSizePx(density)

    /** Diameter of the bubble's disc (half the glow box), in dp. */
    fun discDp(mini: Boolean): Float = 30 * (if (mini) MINI_SCALE else 1f)

    // Keep the bubble this far in from every edge (matches LittleSunWindow).
    private fun edgeMarginPx(density: Float): Int = (8 * density).roundToInt()

    // ---- Window origin ----------------------------------------------------
    // Everything here is in real display coordinates (display bounds, gesture
    // insets, the full-screen interaction window the morphs run in, a widget's
    // screen bounds). A small TOP|START overlay window's x/y aren't: its origin
    // sits below the status bar / cutout (FLAG_LAYOUT_NO_LIMITS only lets the
    // frame extend past the screen, it doesn't move the origin), so placed
    // as-is the bubble rested a status bar lower than the morphs aimed for.
    //
    // Opting the window into display coordinates instead (FLAG_LAYOUT_IN_SCREEN
    // + fitInsetsTypes = 0 + SHORT_EDGES cutout mode) made the bubble not show
    // at all on a Galaxy S23 - so the windows keep their plain layout and
    // [placeInDisplay] shifts them by where that origin really is: measured off
    // the live bubble ([recordWindowOrigin]), or estimated from the insets
    // until then.

    // Last measured origin, with the display rotation it was measured at (the
    // origin moves with the bars/cutout when the screen turns).
    @Volatile
    private var measuredOrigin: Triple<Int, Int, Int>? = null

    @Suppress("DEPRECATION")
    private fun rotation(wm: WindowManager): Int = wm.defaultDisplay.rotation

    private fun windowOrigin(ctx: Context, wm: WindowManager): Pair<Int, Int> {
        measuredOrigin?.let { (rot, x, y) -> if (rot == rotation(wm)) return x to y }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val insets = wm.currentWindowMetrics.windowInsets.getInsets(
                WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
            )
            return insets.left to insets.top
        }
        return 0 to systemDimenPx(ctx, "status_bar_height")
    }

    /**
     * Record where a window placed by [placeInDisplay] actually landed on screen
     * ([screenX]/[screenY], e.g. from getLocationOnScreen) for the window x/y it
     * was given. Returns true when that corrects the origin in use, so the
     * caller should re-place its window.
     */
    fun recordWindowOrigin(
        ctx: Context,
        wm: WindowManager,
        params: WindowManager.LayoutParams,
        screenX: Int,
        screenY: Int,
    ): Boolean {
        val before = windowOrigin(ctx, wm)
        val origin = (screenX - params.x) to (screenY - params.y)
        measuredOrigin = Triple(rotation(wm), origin.first, origin.second)
        return origin != before
    }

    /** Place a TOP|START overlay window so its top-left lands at display (x, y). */
    fun placeInDisplay(
        ctx: Context,
        wm: WindowManager,
        params: WindowManager.LayoutParams,
        x: Int,
        y: Int,
    ) {
        params.flags = params.flags or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        params.gravity = Gravity.TOP or Gravity.START
        val (ox, oy) = windowOrigin(ctx, wm)
        params.x = x - ox
        params.y = y - oy
    }

    // The full display bounds the bubble lives within (display coordinates).
    fun displayWidthPx(ctx: Context, wm: WindowManager): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            wm.currentWindowMetrics.bounds.width()
        else ctx.resources.displayMetrics.widthPixels

    fun displayHeightPx(ctx: Context, wm: WindowManager): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
            wm.currentWindowMetrics.bounds.height()
        else ctx.resources.displayMetrics.heightPixels

    // (top, bottom) mandatory-gesture + system-bar insets, read live so the
    // bubble can't be parked under the notification shade or home gesture.
    private fun gestureInsets(ctx: Context, wm: WindowManager): Pair<Int, Int> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val insets = wm.currentWindowMetrics.windowInsets.getInsets(
                WindowInsets.Type.mandatorySystemGestures() or WindowInsets.Type.systemBars()
            )
            return insets.top to insets.bottom
        }
        return systemDimenPx(ctx, "status_bar_height") to
            systemDimenPx(ctx, "navigation_bar_height")
    }

    private fun systemDimenPx(ctx: Context, resName: String): Int {
        val id = ctx.resources.getIdentifier(resName, "dimen", "android")
        return if (id > 0) ctx.resources.getDimensionPixelSize(id) else 0
    }

    // Default top-left when the user has never dragged the bubble: low on the
    // left, clear of the bottom gesture strip.
    private fun defaultTopLeft(ctx: Context, wm: WindowManager): Pair<Int, Int> {
        val density = ctx.resources.displayMetrics.density
        val x = (8 * density).roundToInt()
        val y = displayHeightPx(ctx, wm) - bubbleSizePx(density) - (96 * density).roundToInt()
        return x to y
    }

    /** Clamp a top-left so the bubble stays on-screen, clear of gesture zones. */
    fun clamp(ctx: Context, wm: WindowManager, x: Int, y: Int): Pair<Int, Int> {
        val density = ctx.resources.displayMetrics.density
        val bubble = bubbleSizePx(density)
        val margin = edgeMarginPx(density)
        val (insetTop, insetBottom) = gestureInsets(ctx, wm)
        val minX = margin
        val maxX = (displayWidthPx(ctx, wm) - bubble - margin).coerceAtLeast(minX)
        val minY = insetTop + margin
        val maxY = (displayHeightPx(ctx, wm) - bubble - insetBottom - margin)
            .coerceAtLeast(minY)
        return x.coerceIn(minX, maxX) to y.coerceIn(minY, maxY)
    }

    /** The bubble's resting top-left (saved position or the default), clamped. */
    fun restingTopLeft(
        ctx: Context,
        wm: WindowManager,
        saved: Pair<Int, Int>?,
    ): Pair<Int, Int> {
        val (x, y) = saved ?: defaultTopLeft(ctx, wm)
        return clamp(ctx, wm, x, y)
    }

    // --- Leave zone ("horizon") geometry ---------------------------------
    // The visible drop target for the drag-to-step-away gesture: a soft glow
    // at the bottom-centre that appears while the bubble is being dragged.
    // Carrying the disc within the capture radius of the magnet centre
    // magnetizes it; releasing there commits the leave (the sun sets below
    // the horizon). Kept here with the rest of the bubble geometry so the
    // zone window, the capture test and the snapped disc all agree.

    /** Height of the bottom-anchored leave-zone overlay window. */
    fun leaveZoneHeightPx(density: Float): Int = (240 * density).roundToInt()

    /** Centre of the leave-zone magnet, in full display coordinates. */
    fun magnetCenter(ctx: Context, wm: WindowManager): Pair<Int, Int> {
        val density = ctx.resources.displayMetrics.density
        val (_, insetBottom) = gestureInsets(ctx, wm)
        val x = displayWidthPx(ctx, wm) / 2
        val y = displayHeightPx(ctx, wm) - insetBottom - (72 * density).roundToInt()
        return x to y
    }

    /** Disc centres within this distance of the magnet centre are captured. */
    fun magnetCaptureRadiusPx(density: Float): Int = (80 * density).roundToInt()

    /**
     * The bubble centre as a fraction (0..1) of the display bounds. The
     * full-screen interaction WebView covers the same display, so this fraction
     * maps 1:1 onto its viewport for the departing morph target. The centre is
     * the same at either size, so this needs no mini flag.
     *
     * That 1:1 holds only because the bubble is placed in display coordinates
     * ([placeInDisplay]), like the full-screen interaction window.
     */
    fun restingCenterFractions(
        ctx: Context,
        wm: WindowManager,
        saved: Pair<Int, Int>?,
    ): Pair<Float, Float> {
        val density = ctx.resources.displayMetrics.density
        val bubble = bubbleSizePx(density)
        val (x, y) = restingTopLeft(ctx, wm, saved)
        val fracX = (x + bubble / 2f) / displayWidthPx(ctx, wm)
        val fracY = (y + bubble / 2f) / displayHeightPx(ctx, wm)
        return fracX to fracY
    }
}

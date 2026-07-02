package com.minded.minded.overlay

import android.content.Context
import android.os.Build
import android.view.WindowInsets
import android.view.WindowManager
import kotlin.math.roundToInt

/**
 * Single source of truth for where the draggable Little Sun bubble rests on
 * screen.
 *
 * Shared by [LittleSunWindow] — which positions the actual overlay — and the
 * interaction WebView's departing-sun morph, which needs to know where the
 * bubble will appear so the gliding sun lands exactly there as it hands off to
 * the persistent timer (see InteractionWindowJavaScriptInterface
 * .getLittleSunRestCenter). Keeping the geometry here stops the two from
 * drifting: the bubble moved to a free-floating, draggable position (#51), so a
 * fixed corner is no longer where it rests.
 */
object LittleSunPosition {

    fun bubbleSizePx(density: Float): Int = (60 * density).roundToInt()

    // Keep the bubble this far in from every edge (matches LittleSunWindow).
    private fun edgeMarginPx(density: Float): Int = (8 * density).roundToInt()

    // The full display bounds the bubble lives within (gravity TOP|START +
    // FLAG_LAYOUT_NO_LIMITS → real display coordinate space, behind the bars).
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

    /** The bubble's resting top-left (saved position or default), clamped. */
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
     * maps 1:1 onto its viewport for the departing morph target.
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

package com.minded.minded.widget

import java.util.Locale
import kotlin.math.ceil

/**
 * Where the widget's sun sits, so a tap can hand it to the app *as the same
 * sun*: the shell disc's first paint lands on the widget's sun and the rise into
 * the interaction glides from the home screen in (the web side:
 * widgetArrival.ts). The sun must always morph, never vanish and reappear.
 *
 * Two halves. [inTile] runs where the widget is composed, which knows the tile
 * size and layout but not where on screen it is; [toLaunchParam] runs in
 * MainActivity, which gets the tile's on-screen bounds from the launcher
 * (Intent.sourceBounds) but knows nothing of the layout. The spot travels
 * between them as fractions of the tile.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
object WidgetSunSpot {

    /** The disc's share of the sun/moon drawable (72 of the 108 viewport). */
    const val DISC_FRACTION_OF_IMAGE = 72f / 108f

    /** The sun's centre (fractions of the tile) and disc diameter (of the tile width). */
    data class Spot(val centerX: Float, val centerY: Float, val discOfWidth: Float) {
        fun toArray(): FloatArray = floatArrayOf(centerX, centerY, discOfWidth)

        companion object {
            fun fromArray(a: FloatArray?): Spot? =
                if (a != null && a.size == 3) Spot(a[0], a[1], a[2]) else null
        }
    }

    /**
     * The sun's spot in a [widthDp]×[heightDp] tile whose sun drawable is
     * [imageDp] square. Without a [prompt] the sun is centred (the bare sun, and
     * the night card's lone moon). Beneath a prompt it sits below the text in a
     * vertically centred column (MyAppWidget.PromptCard: [paddingDp] all round,
     * [spacerDp] between); the text's height is estimated from its length at
     * [fontSp] - a launcher's real line breaks can differ by a line, which moves
     * the glide's start by a few dp, well inside what reads as "from the widget".
     */
    fun inTile(
        widthDp: Float,
        heightDp: Float,
        imageDp: Float,
        prompt: String? = null,
        fontSp: Float = 15f,
        paddingDp: Float = 12f,
        spacerDp: Float = 8f,
    ): Spot {
        val disc = imageDp * DISC_FRACTION_OF_IMAGE / widthDp
        if (prompt == null) return Spot(0.5f, 0.5f, disc)
        val charsPerLine = ((widthDp - 2 * paddingDp) / (fontSp * SERIF_EM_PER_CHAR)).coerceAtLeast(1f)
        val lines = ceil(prompt.length / charsPerLine).coerceIn(1f, MAX_LINES)
        val textDp = lines * fontSp * LINE_HEIGHT_EM
        val contentDp = textDp + spacerDp + imageDp
        val topDp = maxOf(paddingDp, (heightDp - contentDp) / 2)
        val centerYDp = topDp + textDp + spacerDp + imageDp / 2
        return Spot(0.5f, (centerYDp / heightDp).coerceIn(0f, 1f), disc)
    }

    /**
     * The `&sunFrom=` hint for the web shell: the sun's centre as fractions of
     * the display (the WebView is edge-to-edge, so these are viewport fractions,
     * like the Little Sun's getLittleSunRestCenter) and its disc in dp. Built only
     * from numbers and printed as plain decimals, so nothing but three numbers
     * can reach the WebView location; null if anything is off (no bounds from the
     * launcher, a degenerate display) and the shell rises from the bar instead.
     */
    fun toLaunchParam(
        spot: Spot,
        boundsLeft: Int,
        boundsTop: Int,
        boundsWidth: Int,
        boundsHeight: Int,
        displayWidthPx: Int,
        displayHeightPx: Int,
        density: Float,
    ): String? {
        if (boundsWidth <= 0 || boundsHeight <= 0 || displayWidthPx <= 0 || displayHeightPx <= 0 || density <= 0f) {
            return null
        }
        val x = (boundsLeft + spot.centerX * boundsWidth) / displayWidthPx
        val y = (boundsTop + spot.centerY * boundsHeight) / displayHeightPx
        val discDp = spot.discOfWidth * boundsWidth / density
        if (x !in 0f..1f || y !in 0f..1f || discDp !in 8f..400f) return null
        return String.format(Locale.US, "%.4f,%.4f,%.1f", x, y, discDp)
    }

    // A serif's average advance is about half an em; Noto Serif's line box is
    // about 1.33em. Only the glide's start point rides on these.
    private const val SERIF_EM_PER_CHAR = 0.5f
    private const val LINE_HEIGHT_EM = 1.33f
    private const val MAX_LINES = 3f
}

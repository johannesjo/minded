package com.minded.minded.ui.theme

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.LinearGradientShader
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas

/**
 * Vertical gradient background that dithers, so the loading sky doesn't band.
 *
 * `Modifier.background(Brush.verticalGradient(...))` draws the gradient without
 * dithering, which on an 8-bit surface shows as visible horizontal "lines"
 * across large, low-contrast gradients — most obviously the dark sky, whose
 * deep blues are very close together and stretch the full screen height. The
 * WebView that takes over paints the same gradient with dithering and so looks
 * smooth, making the loading frame stand out. Drawing the shader through a
 * framework Paint with `isDither = true` enables Skia's gradient dithering and
 * matches that smooth look. Keep stops in sync with AppBgGradient*Stops.
 */
fun Modifier.ditheredVerticalGradient(stops: Array<Pair<Float, Color>>): Modifier =
    drawWithCache {
        val shader = LinearGradientShader(
            from = Offset.Zero,
            to = Offset(0f, size.height),
            colors = stops.map { it.second },
            colorStops = stops.map { it.first },
        )
        val paint = Paint().apply {
            this.shader = shader
            asFrameworkPaint().isDither = true
        }
        onDrawBehind {
            drawIntoCanvas { canvas ->
                canvas.drawRect(0f, 0f, size.width, size.height, paint)
            }
        }
    }

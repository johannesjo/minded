package com.minded.minded.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import com.minded.minded.R

/**
 * Tonight's moon as a bitmap for the widget: the drawn moon
 * (ic_sun_widget_night - body, maria, cool halo) with WidgetMoon's night side
 * laid over its disc, so the home screen shows the same phase as the app.
 * A VectorDrawable can't carry a per-day path, so the moon is rasterised once
 * per refresh at the size it's shown; at (near) full moon there is no shadow
 * and the caller keeps the plain vector instead.
 */
internal object WidgetMoonBitmap {

    // The disc's box inside the 108-unit moon vector: r=36 about (54, 54).
    private const val DISC_LEFT = 18f / 108f
    private const val DISC_SIZE = 72f / 108f

    // Keeps a large tile's bitmap well inside the RemoteViews budget; the moon
    // is a soft object, so a mild upscale past this is invisible.
    private const val MAX_PX = 480

    fun render(context: Context, outline: List<Pair<Float, Float>>, sizePx: Int): Bitmap? {
        val size = sizePx.coerceIn(1, MAX_PX)
        val moon = context.getDrawable(R.drawable.ic_sun_widget_night) ?: return null
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        moon.setBounds(0, 0, size, size)
        moon.draw(canvas)

        val discLeft = DISC_LEFT * size
        val discSize = DISC_SIZE * size
        val unit = discSize / 100f
        val shadow = Path().apply {
            fillType = Path.FillType.EVEN_ODD
            // Everything (well past the disc, for the blur) …
            addRect(-20 * unit, -20 * unit, 120 * unit, 120 * unit, Path.Direction.CW)
            // … except the lit lune.
            outline.forEachIndexed { i, (x, y) ->
                if (i == 0) moveTo(x * unit, y * unit) else lineTo(x * unit, y * unit)
            }
            close()
            offset(discLeft, discLeft)
        }
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(
                WidgetMoon.EARTHSHINE_RGB shr 16 and 0xFF,
                WidgetMoon.EARTHSHINE_RGB shr 8 and 0xFF,
                WidgetMoon.EARTHSHINE_RGB and 0xFF,
            )
            alpha = (WidgetMoon.EARTHSHINE_OPACITY * 255).toInt()
            // BlurMaskFilter takes a radius; Skia's sigma is ≈ 0.57735·r + 0.5.
            val sigma = WidgetMoon.BLUR_STD_DEVIATION * unit
            val radius = ((sigma - 0.5f) / 0.57735f).coerceAtLeast(0.5f)
            maskFilter = BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL)
        }
        canvas.save()
        // The night side lives on the disc's face only - never the halo.
        canvas.clipPath(Path().apply {
            addCircle(discLeft + discSize / 2, discLeft + discSize / 2, discSize / 2, Path.Direction.CW)
        })
        canvas.drawPath(shadow, paint)
        canvas.restore()
        return bitmap
    }
}

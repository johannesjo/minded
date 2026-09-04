package com.minded.minded.overlay

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.minded.minded.R
import java.util.Calendar

/** Pre-dithered native frames mirroring the WebView ambient-sky keyframes. */
internal enum class LoadingSkyFrame {
    DARK,
    DAWN,
    MORNING,
    MIDDAY,
    AFTERNOON,
    DUSK,
}

/** Two adjacent frames and the WebView-equivalent interpolation between them. */
internal data class LoadingSkyBlend(
    val from: LoadingSkyFrame,
    val to: LoadingSkyFrame,
    val progress: Float,
) {
    val closestFrame: LoadingSkyFrame
        get() = if (progress < 0.5f) from else to

    companion object {
        fun dark() = LoadingSkyBlend(LoadingSkyFrame.DARK, LoadingSkyFrame.DARK, 0f)
    }
}

/**
 * Match extension/src/shared/skyTimeline.ts: night from 19:00–06:00, then
 * piecewise-linear interpolation through 06:00, 09:00, 13:00, 16:30, 19:00.
 */
internal fun loadingSkyBlendAt(hour: Double): LoadingSkyBlend {
    if (hour < 6.0 || hour >= 19.0) return LoadingSkyBlend.dark()

    return when {
        hour < 9.0 -> blend(
            LoadingSkyFrame.DAWN,
            LoadingSkyFrame.MORNING,
            hour,
            6.0,
            9.0,
        )
        hour < 13.0 -> blend(
            LoadingSkyFrame.MORNING,
            LoadingSkyFrame.MIDDAY,
            hour,
            9.0,
            13.0,
        )
        hour < 16.5 -> blend(
            LoadingSkyFrame.MIDDAY,
            LoadingSkyFrame.AFTERNOON,
            hour,
            13.0,
            16.5,
        )
        else -> blend(
            LoadingSkyFrame.AFTERNOON,
            LoadingSkyFrame.DUSK,
            hour,
            16.5,
            19.0,
        )
    }
}

private fun blend(
    from: LoadingSkyFrame,
    to: LoadingSkyFrame,
    hour: Double,
    fromHour: Double,
    toHour: Double,
): LoadingSkyBlend = LoadingSkyBlend(
    from = from,
    to = to,
    progress = ((hour - fromHour) / (toHour - fromHour)).toFloat(),
)

internal fun LoadingSkyFrame.drawableResource(): Int = when (this) {
    LoadingSkyFrame.DARK -> R.drawable.loading_sky_dark
    LoadingSkyFrame.DAWN -> R.drawable.loading_sky_dawn
    LoadingSkyFrame.MORNING -> R.drawable.loading_sky_light
    LoadingSkyFrame.MIDDAY -> R.drawable.loading_sky_midday
    LoadingSkyFrame.AFTERNOON -> R.drawable.loading_sky_afternoon
    LoadingSkyFrame.DUSK -> R.drawable.loading_sky_dusk
}

/**
 * The native sky an overlay WebView loads over: the clock-matched frame, and
 * the next one blended in at the WebView's own interpolation weight. Shared by
 * every full-screen overlay that covers a blocked app (the intervention and the
 * sleep wind-down), so their first frame is the same sky the web content then
 * fades into.
 */
@Composable
internal fun LoadingSkyBackdrop(blend: LoadingSkyBlend) {
    Image(
        painter = painterResource(blend.from.drawableResource()),
        contentDescription = null,
        contentScale = ContentScale.FillBounds,
        modifier = Modifier.fillMaxSize(),
    )
    if (blend.from != blend.to && blend.progress > 0f) {
        Image(
            painter = painterResource(blend.to.drawableResource()),
            contentDescription = null,
            contentScale = ContentScale.FillBounds,
            alpha = blend.progress,
            modifier = Modifier.fillMaxSize(),
        )
    }
}

/** The local wall-clock hour with minutes as a fraction, e.g. 18.5 for 18:30. */
internal fun currentLocalHour(): Double {
    val now = Calendar.getInstance()
    return now.get(Calendar.HOUR_OF_DAY) + now.get(Calendar.MINUTE) / 60.0
}

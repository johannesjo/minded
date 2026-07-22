package com.minded.minded.overlay

import com.minded.minded.R

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

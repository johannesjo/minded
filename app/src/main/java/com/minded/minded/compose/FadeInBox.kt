package com.minded.minded.compose

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha


@Composable
fun FadeInBox(isVisible: Boolean, duration: Int = 1000, content: @Composable () -> Unit) {
    val alpha by animateFloatAsState(
        targetValue = if (isVisible) 1f else 0f,
        animationSpec = tween(durationMillis = duration) // Increase duration to 2000 milliseconds (2 seconds)
    )
    Box(
        modifier = Modifier.alpha(alpha)
    ) {
        content()
    }
}

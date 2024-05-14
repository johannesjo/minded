package com.minded.minded.ui.compose

import android.util.Log
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.rememberScrollableState
import androidx.compose.foundation.gestures.scrollable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.minded.minded.ui.theme.StandardGradientLight
import kotlinx.coroutines.delay
import kotlin.math.hypot
import kotlin.math.min

@Composable
fun SuccessSun(
    text: String = "tap sun to close app",
    inDuration: Int = 4000,
    successDuration: Int = 1000,
    fadeOutDuration: Int = 1000,
    onSunTap: () -> Unit = {},
    onAfterTapSun: () -> Unit = {},
    onAfterShow: () -> Unit = {},
) {
    val initialRadius = 0f
    var isClickTriggered by remember { mutableStateOf(false) }
    var radius by remember { mutableFloatStateOf(initialRadius) }
    var textAlpha by remember { mutableStateOf(0f) }
    val animatedTextAlpha by animateFloatAsState(
        targetValue = textAlpha,
        animationSpec = tween(
            durationMillis = 500,
            easing = LinearEasing
        )
    )
    var boxAlpha by remember { mutableStateOf(1f) }
    val animatedBoxAlpha by animateFloatAsState(
        targetValue = boxAlpha,
        animationSpec = tween(
            durationMillis = fadeOutDuration,
            easing = LinearEasing
        )
    )

    Box(
        modifier = Modifier
            .scrollable(
                orientation = Orientation.Vertical,
                enabled = false,
                state = rememberScrollableState { 0f }
            )
            .alpha(animatedBoxAlpha)
            .fillMaxSize()
            .clickable(onClick = { onSunTap(); isClickTriggered = true; })
            .background(
                brush = Brush.verticalGradient(
                    colors = StandardGradientLight
                )
            )
            .drawBehind {
                drawCircle(
                    color = Color.White,
                    radius = radius,
                    center = Offset(size.width / 2f, size.height / 2f),
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = Color.Black.copy(alpha = animatedTextAlpha)
        )
    }
    val animatedRadius = remember { Animatable(initialRadius) }
    val (width, height) = with(LocalConfiguration.current) {
        with(LocalDensity.current) { screenWidthDp.dp.toPx() to screenHeightDp.dp.toPx() }
    }
    val minRadiusPx = min(width, height) / 2
//    val maxRadiusPx = max(width, height) / 2
    val maxRadiusPx = hypot(width, height)


    LaunchedEffect(false) {
        animatedRadius.animateTo(minRadiusPx, animationSpec = tween(inDuration)) {
            radius = value
        }
        if (!isClickTriggered) {
            boxAlpha = 0f
        }
        delay(fadeOutDuration.toLong())
        Log.v("SuccessSun", "onAfterShow() ${isClickTriggered}")

        if (!isClickTriggered) {
            onAfterShow()
        }
    }

    LaunchedEffect(isClickTriggered) {
        if (isClickTriggered) {
            textAlpha = 0f
            boxAlpha = 1f
            animatedRadius.animateTo(maxRadiusPx, animationSpec = tween(successDuration)) {
                radius = value
            }
            boxAlpha = 0f
            onAfterTapSun()
        }
    }

    // Start the text animation when the composable first appears
    LaunchedEffect(Unit) {
        textAlpha = 1f
    }
}

@Composable
@Preview(showBackground = true, backgroundColor = 0xFFE4B7B7)
fun SuccessSunPreview() {
    SuccessSun()
}


package com.minded.minded.ui.compose

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import kotlin.math.hypot
import kotlin.math.min

@Composable
fun SuccessSun(
    modifier: Modifier = Modifier,
    inDuration: Int = 1000,
    successDuration: Int = 1000,
    onClick: () -> Unit = {}
) {
    val initialRadius = 0f
    var isClickTriggered by remember { mutableStateOf(false) }
    var radius by remember { mutableFloatStateOf(initialRadius) }
    var textAlpha by remember { mutableStateOf(0f) }
    val animatedAlpha by animateFloatAsState(
        targetValue = textAlpha,
        animationSpec = tween(
            durationMillis = 500,
            easing = LinearEasing
        )
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(onClick = { isClickTriggered = true; onClick() })
            .background(Color.Transparent)
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
            text = "tap sun to close app",
            color = Color.Black.copy(alpha = animatedAlpha)
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
//        animatedRadius.snapTo(initialRadius)
    }

    LaunchedEffect(isClickTriggered) {
        if (isClickTriggered) {
            textAlpha = 0f
            animatedRadius.animateTo(maxRadiusPx, animationSpec = tween(successDuration)) {
                radius = value
            }
//            animatedRadius.snapTo(initialRadius)
        }
    }

    // Start the text animation when the composable first appears
    LaunchedEffect(Unit) {
        textAlpha = 1f
    }
}



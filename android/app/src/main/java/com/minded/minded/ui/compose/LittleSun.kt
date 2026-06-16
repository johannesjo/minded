package com.minded.minded.ui.compose

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp


@Composable
fun LittleSun(
    elapsedSeconds: Int = 0,
    isInitiallyVisible: Boolean = false
) {
    val showText = elapsedSeconds >= 0
    val minutes = if (showText) elapsedSeconds / 60 else 0
    val remainingSeconds = if (showText) elapsedSeconds % 60 else 0
    val clockString = if (showText) String.format("%2d:%02d", minutes, remainingSeconds) else ""
    // A solid, warm little sun rather than a pale white disc — a bright center
    // fading to a warm amber edge so it reads as a sun companion on any
    // wallpaper.
    val sunBrush = Brush.radialGradient(
        colorStops = arrayOf(
            0.0f to Color(0xFFFFF0C2),
            0.55f to Color(0xFFFFB24F),
            1.0f to Color(0xFFF2823C),
        ),
    )
    val textColor = Color(0xFF5A3210)

    var isOverlayVisible by remember { mutableStateOf(isInitiallyVisible) }

    LaunchedEffect(Unit) {
        isOverlayVisible = true
    }

    AnimatedVisibility(
        visible = isOverlayVisible,
        enter = scaleIn(animationSpec = spring(stiffness = Spring.StiffnessLow)),
        exit = fadeOut(animationSpec = tween(500)),
    ) {
        Box(
            modifier = Modifier
//            .border(1.dp, Color.Black, CircleShape  )
                .size(36.dp),
            contentAlignment = Alignment.Center // This will center the inner Box

        ) {
            Box(
                modifier = Modifier
//                .border(1.dp, Color.Red, CircleShape  )
                    .size(30.dp),
                contentAlignment = Alignment.Center // This will center the inner Box

            ) {
                val glowBrush = Brush.radialGradient(
                    listOf(Color(0xCCF2823C), Color.Transparent)
                )
                Canvas(
                    modifier = Modifier.size(64.dp),
                    onDraw = {
                        drawCircle(glowBrush)
                    }
                )

                Box(
                    modifier = Modifier
                        .size(26.dp)
                        .clip(CircleShape)
                        .background(sunBrush),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = clockString,
                        fontSize = 10.sp,
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Bold,
                        color = textColor,
                        maxLines = 1
                    )
                }
            }
        }
    }
}


@Preview
@Composable
fun LittleSunPreview() {
    Surface(
        color = Color.White
    ) {
        LittleSun(elapsedSeconds = 1000, isInitiallyVisible = true)
    }
}

@Preview
@Composable
fun LittleSunPreview2() {
    Surface(
        color = Color.White
    ) {
        LittleSun(elapsedSeconds = 9090, isInitiallyVisible = true)
    }
}

@Preview
@Composable
fun LittleSunPreview3() {
    Surface(
        color = Color.White
    ) {
        LittleSun(elapsedSeconds = 9, isInitiallyVisible = true)
    }
}

//
//fun LittleSun() {
//    Box(
//        modifier = Modifier
//            .background(Color.Green)
//            .size(32.dp)
//            .padding(16.dp) // This will add padding around the box
//    ) {
//        Column(
//            verticalArrangement = Arrangement.SpaceBetween,
//            modifier = Modifier.fillMaxHeight()
//                .background(Color.Yellow),
//        ) {
//            Spacer(
//                modifier = Modifier
//                    .height(15.dp)
//            )
//
//            Surface(
//                shape = CircleShape,
//                color = Color.White,
//                modifier = Modifier.size(32.dp)
//            ) {
//                Box(contentAlignment = Alignment.Center) {
//                    Text(text = "9:56")
//                }
//            }
//        }
//    }
//}
//

package com.minded.minded.ui.compose

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
    onSunTap: () -> Unit = {},
    isInitiallyVisible: Boolean = false
) {
    val minutes = elapsedSeconds / 60
    val remainingSeconds = elapsedSeconds % 60
    val clockString = String.format("%2d:%02d", minutes, remainingSeconds)
    val color = Color.White

    var isOverlayVisible by remember { mutableStateOf(isInitiallyVisible) }

    LaunchedEffect(Unit) {
        isOverlayVisible = true
    }

    AnimatedVisibility(
        visible = isOverlayVisible,
        enter = scaleIn(),
        exit = fadeOut(),
    ) {
        Box(
            modifier = Modifier
//            .border(1.dp, Color.Black, CircleShape  )
                .size(44.dp),
            contentAlignment = Alignment.Center // This will center the inner Box

        ) {
            Box(
                modifier = Modifier
//                .border(1.dp, Color.Red, CircleShape  )
                    .size(36.dp),
                contentAlignment = Alignment.Center // This will center the inner Box

            ) {
                val brush = Brush.radialGradient(listOf(Color.Red, Color.Transparent))
                Canvas(
                    modifier = Modifier.size(90.dp),
                    onDraw = {
                        drawCircle(brush)
                    }
                )

                Box(
                    modifier = Modifier
                        .size(30.dp)
                        .clickable(onClick = onSunTap)
                ) {
                    Surface(
                        shape = CircleShape,
                        color = color,
                        modifier = Modifier
                            .matchParentSize()
//                    .shadow(elevation = 4.dp, shape = CircleShape) // Add shadow here

                    ) {

                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = clockString,
                                fontSize = 10.sp,
                                textAlign = TextAlign.Center,
                                fontWeight = FontWeight.Normal,
                                maxLines = 1
                            )
                        }
                    }
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

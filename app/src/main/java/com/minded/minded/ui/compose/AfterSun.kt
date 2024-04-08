package com.minded.minded.ui.compose

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.AFTER_SUN_CYCLE_DURATION_IN_S


@Composable
fun AfterSun(elapsedSeconds: Int = 0, onSunTap: () -> Unit = {}) {
    val minutes = elapsedSeconds / 60
    val remainingSeconds = elapsedSeconds % 60
    val clockString = String.format("%2d:%02d", minutes, remainingSeconds)
    val pulseAniDuration = 1000
    val pulseColorChangeAniDuration = 2000
    val cycleDuration = 1000 * AFTER_SUN_CYCLE_DURATION_IN_S

    val infiniteTransition = rememberInfiniteTransition()

    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(pulseAniDuration, cycleDuration - pulseAniDuration),
            repeatMode = RepeatMode.Reverse,
            StartOffset(pulseColorChangeAniDuration / 2)
        )
    )
    val color = Color.White
//    val color by infiniteTransition.animateColor(
//        initialValue = Color.White,
//        targetValue = Color(0xFFFFEDCA),
//        animationSpec = infiniteRepeatable(
//            animation = tween(
//                pulseColorChangeAniDuration,
//                cycleDuration - pulseColorChangeAniDuration
//            ),
//            repeatMode = RepeatMode.Reverse,
//        )
//    )


    Box(
        modifier = Modifier
//            .border(1.dp, Color.Black, CircleShape  )
            .size(52.dp),
        contentAlignment = Alignment.Center // This will center the inner Box

    ) {
        Box(
            modifier = Modifier
//                .border(1.dp, Color.Red, CircleShape  )
                .size(44.dp),
            contentAlignment = Alignment.Center // This will center the inner Box

        ) {
            val brush = Brush.radialGradient(listOf(Color.Red, Color.Transparent))
            Canvas(
                modifier = Modifier.size(100.dp),
                onDraw = {
                    drawCircle(brush)
                }
            )

            Box(
                modifier = Modifier
                    .scale(scale)
                    .size(36.dp)
                    .clickable(onClick = onSunTap)
            ) {
                Surface(
                    shape = CircleShape,
                    color = color,
                    modifier = Modifier
                        .matchParentSize()
//                    .shadow(elevation = 4.dp, shape = CircleShape) // Add shadow here

                ) {

                    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                        Text(
                            text = clockString,
                            fontSize = 12.sp,
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


@Preview
@Composable
fun AfterSunPreview() {
    Surface(
        color = Color.White
    ) {
        AfterSun(elapsedSeconds = 1000)
    }
}

@Preview
@Composable
fun AfterSunPreview2() {
    Surface(
        color = Color.White
    ) {
        AfterSun(elapsedSeconds = 9090)
    }
}

@Preview
@Composable
fun AfterSunPreview3() {
    Surface(
        color = Color.White
    ) {
        AfterSun(elapsedSeconds = 9)
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

package com.minded.minded.ui.compose

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay


@Composable
fun SmallMsg(
    msg: String,
    onMsgTap: () -> Unit = {},
    onCountdownComplete: () -> Unit = {},
    isInitiallyVisible: Boolean = false
) {
    val leaveDuration: Int = 3000;
    var isVisible = remember { mutableStateOf(isInitiallyVisible) }
    LaunchedEffect(Unit) {
        isVisible.value = true
        delay(5000)
        isVisible.value = false
        delay(leaveDuration.toLong())
        onCountdownComplete()
    }


    AnimatedVisibility(
        visible = isVisible.value,
        enter = fadeIn(animationSpec = tween(1000)),
        exit = fadeOut(animationSpec = tween(leaveDuration))
    ) {
        Box(
            modifier = Modifier
//                .border(1.dp, Color.Red, CircleShape)
                .padding(start = 6.dp, bottom = 6.dp, end = 6.dp),
            contentAlignment = Alignment.Center // This will center the inner Box

        ) {
            Box(
                modifier = Modifier
//                    .border(1.dp, Color.Red, CircleShape)
                    .shadow(4.dp, CircleShape, true, Color.Red, Color.Red)
                    .clickable(onClick = onMsgTap)
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color.White,
                ) {
                    Box(
                        contentAlignment = androidx.compose.ui.Alignment.Center,
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp)
                    ) {
                        Layout(
                            content = {
                                Text(
                                    text = msg,
                                    fontSize = 14.sp,
                                    textAlign = TextAlign.Center,
                                    fontWeight = FontWeight.Normal,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                )
                            },
                            measurePolicy = { measurables, constraints ->
                                val placeable = measurables.first().measure(constraints)

                                // Set the height of the box based on the height of the text
                                layout(constraints.maxWidth, placeable.height) {
                                    placeable.placeRelative(0, 0)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}


@Preview(showBackground = true)
@Composable
fun SmallMsgPreview() {
    Surface(
        color = Color.White
    ) {
        Box(modifier = Modifier.size(500.dp)) {
            SmallMsg(msg = "Hello, World!", isInitiallyVisible = true)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SmallMsgPreview2() {
    Surface(
        color = Color.White
    ) {
        Box(modifier = Modifier.size(500.dp)) {
            SmallMsg(
                msg = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
                isInitiallyVisible = true
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SmallMsgPreview3() {
    Surface(
        color = Color.White
    ) {
        Box(modifier = Modifier.size(500.dp)) {
            SmallMsg(
                msg = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
                isInitiallyVisible = true
            )
        }
    }
}

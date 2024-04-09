package com.minded.minded.ui.compose

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay


@Composable
fun ReminderMsg(
    msg: String,
    onMsgTap: () -> Unit = {},
    onCountdownComplete: () -> Unit = {},
    isInitiallyVisible: Boolean = false
) {
    var isVisible = remember { mutableStateOf(isInitiallyVisible) }
    val height = 60.dp

    LaunchedEffect(Unit) {
        isVisible.value = true
        delay(5000)
        isVisible.value = false
        delay(3000)
        onCountdownComplete()
    }


    AnimatedVisibility(
        visible = isVisible.value,
        enter = fadeIn(animationSpec = tween(1000)),
        exit = fadeOut(animationSpec = tween(3000))
    ) {
        // Your existing code...
        Box(
            modifier = Modifier
//                .border(1.dp, Color.Red, CircleShape)
                .fillMaxWidth()
                .padding(8.dp)
                .height(height),
            contentAlignment = Alignment.Center // This will center the inner Box

        ) {
            Box(
                modifier = Modifier
                    .shadow(4.dp, CircleShape, true, Color.Red, Color.Red)
                    .fillMaxHeight()
                    .fillMaxWidth()
                    .clickable(onClick = onMsgTap)
            ) {


                Surface(
                    shape = CircleShape,
                    color = Color.White,
                    modifier = Modifier
                        .matchParentSize()
                ) {
                    Box(
                        contentAlignment = androidx.compose.ui.Alignment.Center,
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Text(
                            text = msg,
                            fontSize = 15.sp,
                            textAlign = TextAlign.Center,
                            fontWeight = FontWeight.Normal,
                        )
                    }
                }
            }
        }
    }
}


//@Composable
//fun ReminderMsg(msg: String, onSunTap: () -> Unit = {}) {
//    val snackbarHostState = remember { SnackbarHostState() }
//
//    LaunchedEffect(Unit) {
//        snackbarHostState.showSnackbar(
//            message = msg,
//            actionLabel = "Answer",
//            duration = SnackbarDuration.Short
//        )
//
//    }
//
//    Box(
//        modifier = Modifier
//            .fillMaxWidth()
//            .height(222.dp),
//        contentAlignment = Alignment.Center
//    ) {
//        SnackbarHost(
//            hostState = snackbarHostState,
//            modifier = Modifier.align(Alignment.BottomCenter)
//        )
//    }
//}


@Preview(showBackground = true)
@Composable
fun ReminderMsgPreview() {
    Surface(
        color = Color.White
    ) {
        Box(modifier = Modifier.size(500.dp)) {
            ReminderMsg(msg = "Hello, World!", isInitiallyVisible = true)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun ReminderMsgPreview2() {
    Surface(
        color = Color.White
    ) {
        Box(modifier = Modifier.size(500.dp)) {
            ReminderMsg(
                msg = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
                isInitiallyVisible = true
            )
        }
    }
}

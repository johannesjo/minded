package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp


@Composable
fun ReminderMsg(msg: String, onSunTap: () -> Unit = {}) {
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        snackbarHostState.showSnackbar(
            message = msg,
            actionLabel = "Answer",
            duration = SnackbarDuration.Short
        )

    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(222.dp),
        contentAlignment = Alignment.Center
    ) {
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

//@Composable
//fun ReminderMsg(msg: String, onSunTap: () -> Unit = {}) {
//    Box(
//        modifier = Modifier
////                .border(1.dp, Color.Red, CircleShape  )
//            .fillMaxWidth()
//            .height(222.dp),
//        contentAlignment = Alignment.Center // This will center the inner Box
//
//    ) {
//
//
////        Box(
////            modifier = Modifier
////                .fillMaxWidth()
////                .fillMaxHeight()
////                .clickable(onClick = onSunTap)
////        ) {
////            Surface(
////                shape = CircleShape,
////                color = Color.White,
////                modifier = Modifier
////                    .matchParentSize()
////            ) {
////                Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
////                    Text(
////                        text = msg,
////                        fontSize = 14.sp,
////                        textAlign = TextAlign.Center,
////                        fontWeight = FontWeight.Normal,
////                        maxLines = 1
////                    )
////                }
////            }
////        }
//    }
//}


@Preview(showBackground = true)
@Composable
fun ReminderMsgPreview() {
    Surface(
        color = Color.White
    ) {
        ReminderMsg(msg = "Hello, World!")
    }
}

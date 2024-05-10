package com.minded.minded.ui.compose

import android.util.Log
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.interactions.QuestionCmp
import com.minded.minded.ui.theme.StandardGradient


@Composable
fun InteractionOverlayBig(
    sharedOverlayViewModel: SharedOverlayViewModel,
    onSuccess: (answerTxt: String) -> Unit = { },
    onSkip: () -> Unit = { },
    initialVisible: Boolean = false,
    // TODO enum
    mode: String = "QUESTION",
) {
    val sharedData by sharedOverlayViewModel.sharedData.collectAsState()
    val initialFadeInDuration = 500
    val fadeOutOverlayDuration = 500
    var isOverlayVisible by remember { mutableStateOf(initialVisible) }


    LaunchedEffect(Unit) {
        isOverlayVisible = true
    }

    AnimatedVisibility(
        visible = isOverlayVisible,
        enter = fadeIn(animationSpec = tween(initialFadeInDuration)),
        exit = fadeOut(animationSpec = tween(fadeOutOverlayDuration, easing = LinearEasing)),
    ) {
        Surface(
            onClick = {
                Log.v("SVC", "click BG")
                onSkip()
            },
        ) {
            Box(
                modifier = Modifier
                    .background(
                        brush = Brush.verticalGradient(
                            colors = StandardGradient
                        )
                    )
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.SpaceAround,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {

                    Column(
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (mode == "QUESTION") {
                            QuestionCmp(
                                sharedData = sharedData,
                                sharedOverlayViewModel = sharedOverlayViewModel,
                                onSubmitAnswer = onSuccess,
                            )
                        } else {
                            Text(text = "MOOD SELECTOR")
                        }
                    }
                }
            }
        }
    }
}


@Composable
@Preview(showBackground = true)
fun InteractionOverlayBigPreview() {
    InteractionOverlayBig(
        initialVisible = true, sharedOverlayViewModel = SharedOverlayViewModel(
            answerRepository = null
        )
    )
}

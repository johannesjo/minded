@file:OptIn(ExperimentalMaterial3Api::class)

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
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.theme.StandardGradient


@Composable
fun OverlayBig(
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
    onSkip: () -> Unit = { },
    rndQuestion: QuestionForPrompt,
    initialVisible: Boolean = false
) {
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
                        Text(
                            text = "${rndQuestion.t}?",
                            fontSize = 22.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .padding(16.dp)
                        )
                        TextInput(
                            initialVal = "${rndQuestion.prompt ?: ""} ",
                            onSubmit = {
                                onSubmitAnswer(it)
                                Log.v("Overlay.kt", "submitAnswer")
                            },
                        )
                    }
                }
            }
        }
    }
}


@Composable
@Preview(showBackground = true)
fun OverlayBigPreview() {
    val question = QuestionForPrompt(
        t = "What is the capital of France?",
        prompt = "Enter your answer",
        categoryId = QuestionCategoryId.CalmingThoughts
    )
    OverlayBig(rndQuestion = question, initialVisible = true)
}

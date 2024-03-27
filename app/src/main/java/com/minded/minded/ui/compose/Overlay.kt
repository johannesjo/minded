package com.minded.minded.ui.compose

import android.util.Log
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.theme.StandardGradient
import kotlinx.coroutines.delay


@Composable
fun OverlayBig(
    removeOverlay: () -> Unit = { },
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
    rndQuestion: QuestionForPrompt,
    initialVisible: Boolean = false
) {
    val fadeOutDuration = 1000
    var visible by remember { mutableStateOf(initialVisible) }
    fun fadeOutOverlay() {
        visible = false
    }

    LaunchedEffect(Unit) {
        visible = true
    }
    LaunchedEffect(visible) {
        Log.v("ANI", "visible: $visible")
        if(!visible) {
            delay(fadeOutDuration.toLong())
            removeOverlay()
        }
    }

    // TODO make background click work again
//    FadeInBox(visible) {
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(animationSpec = tween(1000)),
        exit = fadeOut(animationSpec = tween(fadeOutDuration)),
    ) {
        Text(text = "asd")
        Surface(
            onClick = {
                Log.v("SVC", "click BG")
                fadeOutOverlay()
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
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Replace this with your own Compose UI
                    Text(
                        text = "${rndQuestion.t}?",
                        fontSize = 22.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .padding(16.dp)
                    )
                    TextInput(initialVal = "${rndQuestion.prompt ?: ""} ", onSubmit = {
                        onSubmitAnswer(it)
                        fadeOutOverlay()
                        Log.v("Overlay.kt", "submitAnswer")
                    })
                }
            }
        }
    }
}

@Composable
fun TextInput(initialVal: String = "", onSubmit: (String) -> Unit = {}) {
    var textState by remember { mutableStateOf(TextFieldValue(initialVal)) }
    val focusRequester = remember { FocusRequester() }
Log.v("OVERLAY", "TextInput ${textState.text}")
    OutlinedTextField(
        singleLine = true,
        value = textState,
        onValueChange = { newTextState ->
            textState = newTextState.copy(
                text = newTextState.text,
                selection = TextRange(newTextState.text.length)
            )
        },
        label = { Text("") },
        keyboardActions = KeyboardActions(
            onDone = {
                Log.v("SVC", "DONE")
                focusRequester.requestFocus()
                onSubmit(textState.text)
            }
        ),
        trailingIcon = {
            IconButton(onClick = {
                textState = textState.copy(
                    text = "",
                )
            }) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Visibility"
                )
            }
        },
        modifier = Modifier
            .focusRequester(focusRequester)
            .wrapContentHeight(align = Alignment.CenterVertically),
    )
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
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

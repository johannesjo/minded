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
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
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
    onBackToMain: () -> Unit = { },
    rndQuestion: QuestionForPrompt,
    initialVisible: Boolean = false
) {
    val sunAniInDuration = 2000
    val sunAniFinalDuration = 2000
    val fadeOutOverlayDuration = 1000
    var isOverlayVisible by remember { mutableStateOf(initialVisible) }
    var isShowSuccessSun by remember { mutableStateOf(initialVisible) }
    var isUserSunCloseInProgress by remember { mutableStateOf(initialVisible) }

    fun fadeOutOverlay() {
        isOverlayVisible = false
    }

    fun startSuccessFlow() {
        isShowSuccessSun = true
    }

    LaunchedEffect(Unit) {
        isOverlayVisible = true
    }


    LaunchedEffect(isShowSuccessSun) {
        Log.v("ANI", "isShowSuccessSun: $isShowSuccessSun")
        if (isShowSuccessSun) {
            delay(sunAniInDuration.toLong() + 2000)
            isOverlayVisible = false
        }
    }

    LaunchedEffect(isOverlayVisible) {
        Log.v("ANI", "isVisible: $isOverlayVisible")
        if (!isOverlayVisible) {
            if (isUserSunCloseInProgress) {
                Log.v("ANI", "onBackToMain after SunClick")
                onBackToMain()
                removeOverlay()
            } else {
                delay(fadeOutOverlayDuration.toLong())
                Log.v("ANI", "hideOverlayRegular $isUserSunCloseInProgress")
                if (!isUserSunCloseInProgress) {
                    removeOverlay()
                }
            }
        }
    }

    AnimatedVisibility(
        visible = isOverlayVisible,
        enter = fadeIn(animationSpec = tween(1000)),
        exit = fadeOut(animationSpec = tween(fadeOutOverlayDuration, easing = LinearEasing)),
    ) {
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
                if (!isShowSuccessSun) {
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
                            startSuccessFlow();
                            Log.v("Overlay.kt", "submitAnswer")
                        })
                    }
                }
            }
        }

        if (isShowSuccessSun) {
            SuccessSun(
                inDuration = sunAniInDuration,
                onClick = {
                    isUserSunCloseInProgress = true
                },
                successDuration = sunAniFinalDuration,
            )
        }
    }
}


@Composable
fun TextInput(initialVal: String = "", onSubmit: (String) -> Unit = {}) {
    var textState by remember { mutableStateOf(TextFieldValue(initialVal)) }
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current

    OutlinedTextField(
        singleLine = true,
        value = textState,
        onValueChange = { newTextState ->
            textState = newTextState.copy(
                text = newTextState.text,
            )
        },
        label = { Text("") },
        keyboardActions = KeyboardActions(
            onDone = {
                // NOTE this only seems to fail in the emulator
                focusRequester.freeFocus()
                focusManager.clearFocus()
                keyboardController?.hide()
                onSubmit(textState.text)
            }
        ),
        keyboardOptions = KeyboardOptions.Default.copy(
            imeAction = ImeAction.Done,
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
        Log.v("Overlay.kt", "focusRequester.requestFocus()")
        focusRequester.requestFocus()
        textState = textState.copy(
            text = textState.text,
            selection = TextRange(textState.text.length)
        )
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

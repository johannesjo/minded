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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
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
import com.minded.minded.ui.theme.Pink40
import com.minded.minded.ui.theme.PurpleGrey40
import com.minded.minded.ui.theme.StandardGradient
import kotlinx.coroutines.delay


@Composable
fun Overlay(
    endOverlay: (selectedSessionDuration: Int) -> Unit = { },
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
    onBackToMain: () -> Unit = { },
    rndQuestion: QuestionForPrompt,
    initialVisible: Boolean = false
) {

//    LittleSun()

    OverlayBig(
        endOverlay = endOverlay,
        onSubmitAnswer = onSubmitAnswer,
        onBackToMain = onBackToMain,
        rndQuestion = rndQuestion,
        initialVisible = initialVisible
    )
}

@Composable
fun OverlayBig(
    endOverlay: (selectedSessionDuration: Int) -> Unit = { },
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
    onBackToMain: () -> Unit = { },
    rndQuestion: QuestionForPrompt,
    initialVisible: Boolean = false
) {
    val initialFadeInDuration = 500
    val sunAniInDuration = 1000
    val sunJustShowDuration = 2000
    val sunAniFinalDuration = 1000
    val fadeOutOverlayDuration = 500
    var isOverlayVisible by remember { mutableStateOf(initialVisible) }
    var isShowSuccessSun by remember { mutableStateOf(initialVisible) }
    var isUserSunCloseInProgress by remember { mutableStateOf(initialVisible) }
    var selectedSessionTime by remember { mutableStateOf(0) }

    fun fadeOutOverlay() {
        isOverlayVisible = false
    }

    fun startSuccessFlow() {
        isShowSuccessSun = true
    }

    suspend fun superSuccessFlow() {
        Log.v("ANI", "superSuccessFlow")
        onBackToMain()
        delay(500)
        isOverlayVisible = false
        delay(fadeOutOverlayDuration.toLong())
        endOverlay(selectedSessionTime)
    }

    LaunchedEffect(Unit) {
        isOverlayVisible = true
    }


    LaunchedEffect(isUserSunCloseInProgress) {
        Log.v("ANI", "isUserSunCloseInProgress: $isUserSunCloseInProgress")
        if (isUserSunCloseInProgress) {
            superSuccessFlow()
        }
    }

    LaunchedEffect(isShowSuccessSun) {
        Log.v("ANI", "isShowSuccessSun: $isShowSuccessSun")
        if (isShowSuccessSun) {
            delay(sunAniInDuration.toLong())
            delay(sunJustShowDuration.toLong())
            Log.v(
                "ANI",
                "isShowSuccessSun INNER after delay $isShowSuccessSun $isUserSunCloseInProgress"
            )
            if (isUserSunCloseInProgress) {
                superSuccessFlow()
            } else {
                isOverlayVisible = false
            }
        }
    }

    LaunchedEffect(isOverlayVisible) {
        Log.v("ANI", "isVisible: $isOverlayVisible")
        if (!isOverlayVisible) {
            delay(fadeOutOverlayDuration.toLong())
            endOverlay(selectedSessionTime)
        }
    }

    AnimatedVisibility(
        visible = isOverlayVisible,
        enter = fadeIn(animationSpec = tween(initialFadeInDuration)),
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
                        TextInput(
                            initialVal = "${rndQuestion.prompt ?: ""} ",
                            onSubmit = {
                                onSubmitAnswer(it)
                                startSuccessFlow();
                                Log.v("Overlay.kt", "submitAnswer")
                            },
                        )
                        Spacer(modifier = Modifier.height(32.dp)) // Add a spacer for margin

                        TimerButtons(selectedSessionTime, onTimeSelected = {
                            selectedSessionTime = it
//                            isShowTimerButtons = false
                        })
                    }
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


@OptIn(ExperimentalMaterial3Api::class)
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
        colors = TextFieldDefaults.outlinedTextFieldColors(
            focusedBorderColor = PurpleGrey40,
//            focusedBorderColor = Color(0x1A000000),
//            focusedBorderColor = Color(0x00000000),
            unfocusedBorderColor = Pink40
        )
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
fun OverlayPreview() {
    val question = QuestionForPrompt(
        t = "What is the capital of France?",
        prompt = "Enter your answer",
        categoryId = QuestionCategoryId.CalmingThoughts
    )
    Overlay(rndQuestion = question, initialVisible = true)
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

@file:OptIn(ExperimentalMaterial3Api::class)

package com.minded.minded.ui.compose.interactions

import android.util.Log
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.overlay.data.SharedOverlayData
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.TextInput
import com.minded.minded.ui.compose.uiCmp.RoundIconButton
import kotlinx.coroutines.launch


@Composable
fun QuestionCmp(
    sharedData: SharedOverlayData,
    sharedOverlayViewModel: SharedOverlayViewModel,
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
) {
    val logTag = "QuestionCmp"
    Log.v(logTag, "sharedData: $sharedData")
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        if (sharedData.questionForPrompt == null) {
            sharedOverlayViewModel.setRndQuestion()
        }
    }


    Log.v(logTag, "${sharedData.questionForPrompt?.t}")

    Column(
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "${sharedData.questionForPrompt?.t}?",
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .padding(16.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
        TextInput(
            value = "${sharedData.questionForPrompt?.prompt ?: ""} ",
            onSubmit = {
                Log.v(logTag, "onSubmitAnswer: $it")
                if (sharedData.questionForPrompt == null) {
                    throw IllegalStateException("sharedData.questionForPrompt is null")
                }

                coroutineScope.launch {
                    sharedOverlayViewModel.createQuestionWithTimestamp(
                        it,
                        sharedData.questionForPrompt!!.categoryId,
                        sharedData.questionForPrompt!!.id
                    )
                }
                sharedOverlayViewModel.updateSharedData(answerTxt = it)
                onSubmitAnswer(it)
            },
        )
        Spacer(modifier = Modifier.height(32.dp))

        RoundIconButton(onClick = {
            Log.v(logTag, "onChangeQuestion")
            sharedOverlayViewModel.setRndQuestion()
        }) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = "Change Question"
            )
        }
    }
}


@Composable
@Preview(showBackground = true, backgroundColor = 0xFFE4B7B7)
fun QuestionCmpPreview() {
    val question = QuestionForPrompt(
        t = "What is the capital of France",
        prompt = "Enter your answer",
        id = "Q1",
        categoryId = QuestionCategoryId.CalmingThoughts
    )
    val sharedData = SharedOverlayData(questionForPrompt = question)
    QuestionCmp(
        sharedData = sharedData, sharedOverlayViewModel = SharedOverlayViewModel(
            answerRepository = null
        )
    )
}

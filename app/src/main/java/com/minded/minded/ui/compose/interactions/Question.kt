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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.overlay.data.SharedOverlayData
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.TextInput
import com.minded.minded.ui.compose.uiCmp.RoundIconButton
import com.minded.minded.util.getQuestionSmart
import kotlinx.coroutines.launch


@Composable
fun QuestionCmp(
    sharedData: SharedOverlayData,
    sharedOverlayViewModel: SharedOverlayViewModel,
    answerRepository: AnswerRepository? = null,
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
) {
    val logTag = "QuestionCmp"
    var answers by remember { mutableStateOf(listOf<Answer>()) }
    var rndQuestion by remember {
        mutableStateOf(
            sharedData.questionForPrompt ?: getQuestionSmart(emptyList())
        )
    }

    Log.v(logTag, "rndQuestion: $rndQuestion")
    Log.v(logTag, "rndQuestion: $sharedData")

    val coroutineScope = rememberCoroutineScope()
    LaunchedEffect(key1 = answerRepository) {
        if (sharedData.questionForPrompt == null) {
            sharedOverlayViewModel.setRndQuestion()
            coroutineScope.launch {
                answers = answerRepository?.getAllAnswers() ?: emptyList()
                rndQuestion = getQuestionSmart(answers)
            }
        }
    }


    Log.v(logTag, "${sharedData.questionForPrompt?.t}")

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
        Spacer(modifier = Modifier.height(8.dp))
        TextInput(
            value = "${rndQuestion.prompt ?: ""} ",
            onSubmit = {
                Log.v(logTag, "onSubmitAnswer: $it")
                if (answerRepository == null) {
                    throw IllegalStateException("answerRepository is null")
                }
                coroutineScope.launch {
                    answerRepository?.createWithTimestamp(
                        it,
                        rndQuestion.categoryId,
                        rndQuestion.id
                    )
                }
                sharedOverlayViewModel.updateSharedData(answerTxt = it)
                onSubmitAnswer(it)
            },
        )
        Spacer(modifier = Modifier.height(32.dp))

        RoundIconButton(onClick = {
            Log.v(logTag, "onChangeQuestion")
            // TODO consider answers here as well
            val rndQuestionBefore = rndQuestion;
            rndQuestion = getQuestionSmart(emptyList())
            if (rndQuestionBefore == rndQuestion) {
                Log.v(logTag, "onChangeQuestion: same question")
                rndQuestion = getQuestionSmart(emptyList())
            }
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
        t = "What is the capital of France?",
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

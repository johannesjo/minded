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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.compose.TextInput
import com.minded.minded.ui.compose.uiCmp.RoundIconButton


@Composable
fun QuestionCmp(
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
    onChangeQuestion: () -> Unit = { },
    rndQuestion: QuestionForPrompt,
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
        Spacer(modifier = Modifier.height(8.dp))
        TextInput(
            value = "${rndQuestion.prompt ?: ""} ",
            onSubmit = {
                onSubmitAnswer(it)
                Log.v("Overlay.kt", "submitAnswer")
            },
        )
        Spacer(modifier = Modifier.height(32.dp))

        RoundIconButton(onClick = onChangeQuestion) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = "Change Question"
            )
        }
    }
}


@Composable
@Preview(showBackground = true)
fun QuestionCmpPreview() {
    val question = QuestionForPrompt(
        t = "What is the capital of France?",
        prompt = "Enter your answer",
        id = "Q1",
        categoryId = QuestionCategoryId.CalmingThoughts
    )
    QuestionCmp(rndQuestion = question)
}

package com.minded.minded.compose

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.minded.minded.data.Answer

@Composable
fun Dashboard(answers: List<Answer>) {
    Text("DASHBOARD ")
    LazyColumn {
        items(count = answers.size) { index ->
            val answer = answers[index];
            Text("Answer ID: ${answer.uid}, Content: ${answer.txt}")
        }
    }
}

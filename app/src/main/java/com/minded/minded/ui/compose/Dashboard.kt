package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.minded.minded.ui.DashboardViewModel
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun Dashboard(dashboardViewModel: DashboardViewModel = viewModel()) {
    val uiState by dashboardViewModel.uiState.collectAsState()
    val questions = uiState.questionCategories
    Column {
        Text("DASHBOARD ")
                LazyColumn {
            items(count = questions.size) { index ->
                val question = questions[index];
                Text(text = question.dashboardTxt ?: "No text")
            }
        }

//        LazyColumn {
//            items(count = dashboardViewModel.uiState. answers.size) { index ->
//                val answer = answers[index];
//                Text("Answer ID: ${answer.uid}, Content: ${answer.txt}")
//            }
//        }
    }
}

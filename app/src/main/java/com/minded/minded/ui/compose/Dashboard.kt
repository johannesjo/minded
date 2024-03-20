package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.minded.minded.ui.DashboardViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.minded.minded.data.QuestionCategoryForDashboard

@Composable
fun Dashboard(dashboardViewModel: DashboardViewModel = viewModel()) {
    val uiState by dashboardViewModel.uiState.collectAsState()
    val questions = uiState.questionCategories
    LazyColumn {
        items(questions.size) { index ->
            val question = questions[index]
            QuestionCategoryCmp(question);
        }
    }
}


@Composable
fun QuestionCategoryCmp(question: QuestionCategoryForDashboard) {
    Text(text = question.dashboardTxt ?: "No text")
    question.answers.forEach {
        Text(it.txt)
    }
}

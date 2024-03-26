package com.minded.minded.ui.compose

import android.media.ApplicationMediaCapabilities
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.ui.model.DashboardViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.ui.theme.StandardGradient

@Composable
fun Dashboard(
    dashboardViewModel: DashboardViewModel = viewModel(),
    missingCapability: String = "",
    onMissingCapabilityClick: (String) -> Unit = {}
) {
    val uiState by dashboardViewModel.uiState.collectAsState()
    val questions = uiState.questionCategories
//    val missingCapability = uiState.missingCapability


    DashboardMain(questions, missingCapability, onMissingCapabilityClick)
}

@Composable
fun DashboardMain(
    questions: List<QuestionCategoryForDashboard>,
    missingCapability: String,
    onMissingCapabilityClick: (String) -> Unit = {}
) {
    Box(
        modifier = Modifier
            .background(
                brush = Brush.verticalGradient(
                    colors = StandardGradient
                )
            )
    ) {
        if (questions.isEmpty()) {
            Text(
                text = "No questions found",
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Light,
                modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 16.dp)
            )
        }

        LazyColumn {
            items(questions.size) { index ->
                val question = questions[index]
                QuestionCategoryCmp(question);
            }
        }

        if (missingCapability.length > 1) {
            FloatingActionButton(
                onClick = { onMissingCapabilityClick(missingCapability) },
            ) {
                Icon(Icons.Filled.Settings, "Floating action button.")
            }
        }
    }
}


@Composable
fun QuestionCategoryCmp(question: QuestionCategoryForDashboard) {
    Box(
        modifier = Modifier
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Text(
                text = question.dashboardTxt,
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Light,
                modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 16.dp)
            )
            question.answers.forEach {
                Text(
                    it.txt, fontSize = 18.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 8.dp)
                )
            }
        }
    }
}

@Composable
@Preview
fun DashboardMainPreview() {
    DashboardMain(
        listOf(
            QuestionCategoryForDashboard(
                dashboardTxt = "Mock Category 1",
                isTodayOnlyCategory = false,
                isThisWeekOnlyCategory = false,
                categoryId = QuestionCategoryId.CalmingThoughts,
                answers = listOf(
                    // Add your mock Answer objects here
                    Answer(
                        uid = 1,
                        txt = "Mock Answer 1",
                        questionCategoryId = QuestionCategoryId.CalmingThoughts,
                        createdAt = 0,
                        modifiedAt = 0
                    ),
                    Answer(
                        uid = 1,
                        txt = "Mock Answer 2",
                        questionCategoryId = QuestionCategoryId.CalmingThoughts,
                        createdAt = 0,
                        modifiedAt = 0
                    ),
                )
            ),
            QuestionCategoryForDashboard(
                dashboardTxt = "Mock Category 1 a very complicated long category just for the kicks",
                isTodayOnlyCategory = false,
                isThisWeekOnlyCategory = false,
                categoryId = QuestionCategoryId.CalmingThoughts,
                answers = listOf(
                    // Add your mock Answer objects here
                    Answer(
                        uid = 1,
                        txt = "Mock Answer 1",
                        questionCategoryId = QuestionCategoryId.CalmingThoughts,
                        createdAt = 0,
                        modifiedAt = 0
                    ),
                    Answer(
                        uid = 1,
                        txt = "Mock Answer 2 longer longer longer and longer and longer and logner and longer",
                        questionCategoryId = QuestionCategoryId.CalmingThoughts,
                        createdAt = 0,
                        modifiedAt = 0
                    ),
                )
            ),
        ),
        "Missing capability",
        onMissingCapabilityClick = { println("Missing capability clicked") }
    )
}

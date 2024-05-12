package com.minded.minded.ui.compose

import MainActivityJavaScriptInterface
import android.os.Build
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import com.minded.minded.MissingCapability
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.answers.Answer
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.ui.theme.StandardGradient

@Composable
fun Dashboard(
    dashboardViewModel: DashboardViewModel = viewModel(),
    onMissingCapabilityClick: (MissingCapability) -> Unit = {},
) {
    val uiState by dashboardViewModel.uiState.collectAsState()
    val questions = uiState.questionCategories
    val missingCapability = uiState.missingCapabilities

    DashboardMain(questions, missingCapability, onMissingCapabilityClick)
}

@Composable
fun DashboardMain(
    questions: List<QuestionCategoryForDashboard>,
    missingCapabilities: List<MissingCapability>,
    onMissingCapabilityClick: (MissingCapability) -> Unit = {},
) {

    val listState = rememberLazyListState()

    Box(
        modifier = Modifier
            .background(
                brush = Brush.verticalGradient(
                    colors = StandardGradient
                )
            )
    ) {
        if (missingCapabilities.isNotEmpty()) {
            MissingCapabilityView(missingCapabilities, onMissingCapabilityClick)
        } else if (questions.isEmpty()) {
            Text(
                text = "No questions found",
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Light,
                modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 16.dp)
            )
        } else {
            AndroidView(factory = { context ->
                WebView(context).apply {

                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    settings.javaScriptEnabled = true
                    settings.allowFileAccess = true
                    settings.allowFileAccessFromFileURLs = true
                    settings.allowUniversalAccessFromFileURLs = true
                    settings.allowContentAccess = true
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        settings.forceDark = WebSettings.FORCE_DARK_ON
                    }
                    addJavascriptInterface(
                        MainActivityJavaScriptInterface(context),
                        "android"
                    )
                    loadUrl("file:///android_asset/web/src/android/main/index.html")
                }
            })
//            LazyColumn(
//                state = listState,
//                contentPadding = PaddingValues(top = 64.dp, bottom = 64.dp)
//            ) {
//                itemsIndexed(questions) { index, question ->
//                    QuestionCategoryCmp(question);
//                }
//            }
        }
    }
}


@Composable
fun QuestionCategoryCmp(question: QuestionCategoryForDashboard) {
    Box(
        modifier = Modifier
            .padding(top = 16.dp, start = 16.dp, end = 16.dp, bottom = 48.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Text(
                text = question.dashboardTxt.lowercase(),
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
                        modifiedAt = 0,
                        questionId = "Q1"
                    ),
                    Answer(
                        uid = 1,
                        txt = "Mock Answer 2",
                        questionCategoryId = QuestionCategoryId.CalmingThoughts,
                        createdAt = 0,
                        modifiedAt = 0,
                        questionId = "Q2"
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
                        modifiedAt = 0,
                        questionId = "Q1"
                    ),
                    Answer(
                        uid = 1,
                        txt = "Mock Answer 2 longer longer longer and longer and longer and logner and longer",
                        questionCategoryId = QuestionCategoryId.CalmingThoughts,
                        createdAt = 0,
                        modifiedAt = 0,
                        questionId = "Q2"
                    ),
                )
            ),
        ),
        emptyList(),
        onMissingCapabilityClick = { }
    )
}


@Composable
@Preview
fun DashboardMainPreview2() {
    DashboardMain(
        emptyList(),
        emptyList(),
        onMissingCapabilityClick = { }
    )
}

@Composable
@Preview
fun DashboardMainPreview3() {
    DashboardMain(
        emptyList(),
        listOf(MissingCapability.Accessibility),
        onMissingCapabilityClick = { }
    )
}

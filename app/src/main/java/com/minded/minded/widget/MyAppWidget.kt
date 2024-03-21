package com.minded.minded.widget

import android.content.Context
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.text.Text
import com.minded.minded.MyUtil
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.AnswerRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext


class MyAppWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val answerRepository = AnswerRepository(context)

        // Use the repository to fetch data
        val allAnswers = withContext(Dispatchers.IO) {
            Log.d("MyAppWidget", "Fetching all answers")
            val answers = answerRepository.getAllAnswers()
            Log.d("MyAppWidget", "Fetched ${answers.size} answers")
            answers
        }
        val questionDataForDashboard = MyUtil.mapAnswersToQuestions(allAnswers)

        provideContent {
            // create your AppWidget here
            Log.d(
                "MyAppWidget",
                "Displaying dashboard with ${questionDataForDashboard.size} questions"
            )
            QuestionCategoryCmp2(questionDataForDashboard.random())
        }
    }
}


@Composable
fun QuestionCategoryCmp2(question: QuestionCategoryForDashboard) {
    Box(
    ) {
        Column(
        ) {

            Text(
                text = question.dashboardTxt ?: "No text",
            )
            question.answers.forEach {
                Text(it.txt)
            }
        }
    }
}

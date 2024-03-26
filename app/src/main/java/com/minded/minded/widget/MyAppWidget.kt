package com.minded.minded.widget

import android.content.Context
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.theme.PastelYellow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import com.minded.minded.MainActivity
import com.minded.minded.util.mapAnswersToQuestions


class MyAppWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        Log.v("MyAppWidget", "provideGlance")

        val answerRepository = AnswerRepository(context)

        // Use the repository to fetch data
        val allAnswers = withContext(Dispatchers.IO) {
            Log.d("MyAppWidget", "Fetching all answers")
            val answers = answerRepository.getAllAnswers()
            Log.d("MyAppWidget", "Fetched ${answers.size} answers")
            answers
        }
        val questionDataForDashboard = mapAnswersToQuestions(allAnswers)


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
        modifier = GlanceModifier
            .background(
                color = PastelYellow
            ).padding(16.dp)
            .fillMaxHeight()
            .fillMaxWidth()
            .appWidgetBackground()
            .clickable(
                actionStartActivity<MainActivity>()
            )
    ) {
        Column(
        ) {

            Text(
                text = question.dashboardTxt ?: "No text",
                style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold)
            )
            question.answers.forEach {
                Text(it.txt, modifier = GlanceModifier.padding(top = 8.dp))
            }
        }
    }
}

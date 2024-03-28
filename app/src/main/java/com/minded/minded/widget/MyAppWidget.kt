package com.minded.minded.widget

import android.content.Context
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.theme.PastelYellow
import com.minded.minded.util.mapAnswersToQuestions
import kotlin.random.Random


class MyAppWidget : GlanceAppWidget() {

    suspend fun updateAll(context: Context) {
        Log.d("MyAppWidget", "updateAll")
        val manager = GlanceAppWidgetManager(context)
        val glanceIds = manager.getGlanceIds(this.javaClass)
        glanceIds.forEach { glanceId ->
            update(context, glanceId)
        }
    }

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        Log.v("MyAppWidget", "provideGlance")
        val answerRepository = AnswerRepository(context)

        provideContent {
            // create your AppWidget here
            Log.d(
                "MyAppWidget",
                "Displaying dashboard with"
            )
            QuestionCategoryCmp2(answerRepository)
        }
    }

}


@Composable
fun QuestionCategoryCmp2(
    answerRepository: AnswerRepository
) {
    val repository = remember { answerRepository.getAllAnswersFlow() }

    // Retrieve the cache data everytime the content is refreshed
    val allAnswers = repository.collectAsState(initial = emptyList())
    val questionDataForDashboard = mapAnswersToQuestions(allAnswers.value)
    if (questionDataForDashboard.isEmpty()) {
        Log.d("MyAppWidget", "No questions found")
        Box(
            modifier = GlanceModifier
                .background(
                    color = PastelYellow
                ).padding(8.dp)
                .fillMaxHeight()
                .fillMaxWidth()
                .appWidgetBackground()
        ) {
            Text(text = "Nothing yet")
        }
        return
    }

    Log.d("MyAppWidget", "${questionDataForDashboard.size} questions found")
    var questionIndex by remember { mutableIntStateOf(Random.nextInt(questionDataForDashboard.size)) }
    var question by remember { mutableStateOf(questionDataForDashboard[questionIndex]) }

    fun nextQuestion() {
        questionIndex = (questionIndex + 1) % questionDataForDashboard.size
        question = questionDataForDashboard[questionIndex]
    }

    Box(
        modifier = GlanceModifier
            .background(
                color = PastelYellow
            ).padding(8.dp)
            .fillMaxHeight()
            .fillMaxWidth()
            .appWidgetBackground()
            .clickable {
                Log.v("MyAppWidget", "Box clicked")
                nextQuestion();
            }
    ) {
        Column() {
            Text(
                text = question.dashboardTxt,
                style = TextStyle(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                ),
            )
            LazyColumn() {
                items(question.answers.size) { index: Int ->
                    Text(
                        question.answers[index].txt,
                        modifier = GlanceModifier.padding(top = 4.dp).fillMaxWidth().clickable {
                            Log.v("MyAppWidget", "Item clicked")
                            nextQuestion();
                        },
                        style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
                    )
                }
            }

        }
    }
}

//class RefreshAction : ActionCallback {
//    override suspend fun onAction(
//        context: Context,
//        glanceId: GlanceId,
//        parameters: ActionParameters
//    ) {
//
//        Log.v("MyAppWidget", "RefreshAction.onAction")
//        // TODO implement
//        MyAppWidget().update(context, glanceId)
//        MyAppWidget().updateAll(context)
//
//        val manager = GlanceAppWidgetManager(context)
//        val widget = MyAppWidget()
//        val glanceIds = manager.getGlanceIds(widget.javaClass)
//        Log.v("MyAppWidget", "glanceIds: $glanceIds")
//        glanceIds.forEach { glanceId ->
//            widget.update(context, glanceId)
//        }
//    }
//}



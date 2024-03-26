package com.minded.minded.util

import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QUESTION_CATEGORIES_ON_DASHBOARD
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.answers.Answer

fun mapAnswersToQuestions(allAnswers: List<Answer>): List<QuestionCategoryForDashboard> {
    return QUESTION_CATEGORIES_ON_DASHBOARD.map { questionCategoryId ->
        val qc = QUESTION_CATEGORIES[questionCategoryId]
            ?: error("No question category for $questionCategoryId")
        QuestionCategoryForDashboard(
            qc.dashboardTxt,
            questionCategoryId,
            answers = allAnswers.filter { answer -> questionCategoryId == answer.questionCategoryId },
            qc.isTodayOnlyCategory,
            qc.isThisWeekOnlyCategory,
            qc.isQuestionLessWidget,
        )
    }.filter { it.answers.isNotEmpty() }
}

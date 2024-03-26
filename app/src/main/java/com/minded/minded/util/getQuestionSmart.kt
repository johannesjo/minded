package com.minded.minded.util

import android.text.format.DateUtils
import com.minded.minded.data.QUESTIONS
import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.Answer

fun getQuestionSmart(answers: List<Answer>): QuestionForPrompt {
    if (answers.isEmpty()) {
        return QUESTIONS.random()
    }

    val map = mutableMapOf<QuestionCategoryId, Int>()

    QuestionCategoryId.entries.forEach { categoryId ->
        val categoryForAnswer = QUESTION_CATEGORIES[categoryId]
        if (categoryForAnswer?.questions?.isNotEmpty() == true) {
            map[categoryId] = 0
        }
    }

    answers.forEach { answer ->
        val categoryForAnswer = QUESTION_CATEGORIES[answer.questionCategoryId]
            ?: throw IllegalArgumentException("No category found for answer: $answer")

        if (categoryForAnswer.questions?.isEmpty() == true) {
            return@forEach
        }
        if (categoryForAnswer.isTodayOnlyCategory && !DateUtils.isToday(answer.createdAt)) {
            return@forEach
        }
        if (categoryForAnswer.isThisWeekOnlyCategory && !isThisWeek(answer.createdAt)) {
            return@forEach
        }

        map[answer.questionCategoryId] = map[answer.questionCategoryId]!! + 1
    }
    val sortedEntries = map.entries.sortedBy { it.value }
    val nrOfEntriesForLeastUsed = sortedEntries[0].value
    val categoriesLeastUsed = sortedEntries.filter { it.value == nrOfEntriesForLeastUsed }
    val categoryToUse = categoriesLeastUsed.random().key
    val questionsForCategory = QUESTIONS.filter { it.categoryId == categoryToUse }

    println("sortedEntries: $sortedEntries, nrOfEntriesForLeastUsed: $nrOfEntriesForLeastUsed, categoriesLeastUsed: $categoriesLeastUsed, categoryToUse: $categoryToUse, questionsForCategory: $questionsForCategory")

    return questionsForCategory.random()
}

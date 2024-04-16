package com.minded.minded.util

import android.text.format.DateUtils.isToday
import com.minded.minded.data.QUESTIONS
import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.Answer
import java.util.Calendar

val THRESHOLD_MORNING_START = 4
val THRESHOLD_MORNING_END = 14
val THRESHOLD_EVENING_START = 15
val FAKE_RULE_OUT_NR = 9999
val THRESHOLD_LATE_NIGHT_START = 0
val THRESHOLD_LATE_NIGHT_END = 4

fun getQuestionSmart(answers: List<Answer>): QuestionForPrompt {
    val now = Calendar.getInstance()
    val isWeekDayToday = isWorkDay(now)
    val nowHours = now.get(Calendar.HOUR_OF_DAY)

    if (answers.isEmpty()) {
        return (QUESTIONS.random())
    }

    val map = HashMap<QuestionCategoryId, Int>()

    QuestionCategoryId.values().forEach { categoryId ->
        val categoryForAnswer = QUESTION_CATEGORIES[categoryId]
            ?: throw IllegalArgumentException("No category found for answer: $categoryId")

        if (categoryForAnswer.questions?.isNotEmpty() == true) {
            map[categoryId] = 0
        }

        if (categoryForAnswer.isMorningCategory) {
            if (nowHours < THRESHOLD_MORNING_START || nowHours > THRESHOLD_MORNING_END) {
                map[categoryId] = FAKE_RULE_OUT_NR
            }
        }
        if (categoryForAnswer.isEveningCategory) {
            if (nowHours < THRESHOLD_EVENING_START) {
                map[categoryId] = FAKE_RULE_OUT_NR
            }
        }
        if (categoryForAnswer.isLateNightCategory) {
            if (nowHours < THRESHOLD_LATE_NIGHT_START || nowHours > THRESHOLD_LATE_NIGHT_END) {
                map[categoryId] = FAKE_RULE_OUT_NR
            }
        }
        if (categoryForAnswer.isWorkDayCategory && isWeekDayToday) {
            map[categoryId] = FAKE_RULE_OUT_NR
        }
    }

    answers.forEach { answer ->
        val categoryForAnswer = QUESTION_CATEGORIES[answer.questionCategoryId]
        if (categoryForAnswer?.questions?.isNotEmpty() != true) {
            return@forEach
        }
        if (categoryForAnswer.isTodayOnlyCategory && !isToday(answer.createdAt)) {
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
    val categoryToUse = (categoriesLeastUsed.random()).key
    val questionsForCategory = QUESTIONS.filter { it.categoryId == categoryToUse }

    println("sortedEntries: $sortedEntries, nrOfEntriesForLeastUsed: $nrOfEntriesForLeastUsed, categoriesLeastUsed: $categoriesLeastUsed, categoryToUse: $categoryToUse, questionsForCategory: $questionsForCategory")

    return questionsForCategory.random()
}

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
val THRESHOLD_LATE_NIGHT_START = 0
val THRESHOLD_LATE_NIGHT_END = 4
val FAKE_RULE_OUT_NR = 9999

fun getQuestionSmart(answers: List<Answer>): QuestionForPrompt {
    val now = Calendar.getInstance()
    val isWorkDayToday = isWorkDay(now)
    val nowHours = now.get(Calendar.HOUR_OF_DAY)

    if (answers.isEmpty()) {
        return QUESTIONS.random()
    }

    val map = HashMap<QuestionCategoryId, Int>()

    QuestionCategoryId.values().forEach { categoryId ->
        val categoryForAnswer = QUESTION_CATEGORIES[categoryId]
        if (categoryForAnswer?.questions?.isNotEmpty() == true) {
            map[categoryId] = 0
        }
        if (categoryForAnswer?.frequencyModifier ?: 0 > 0) {
            map[categoryId] = -1 * (categoryForAnswer?.frequencyModifier ?: 0)
        }

        if (categoryForAnswer?.isMorningCategory == true) {
            if (nowHours < THRESHOLD_MORNING_START || nowHours > THRESHOLD_MORNING_END) {
                println("getQuestionSmart(): SKIP MORNING $categoryForAnswer")
                map[categoryId] = FAKE_RULE_OUT_NR
            }
        }
        if (categoryForAnswer?.isEveningCategory == true) {
            if (nowHours < THRESHOLD_EVENING_START) {
                println("getQuestionSmart(): SKIP EVENING $categoryForAnswer")
                map[categoryId] = FAKE_RULE_OUT_NR
            }
        }
        if (categoryForAnswer?.isLateNightCategory == true) {
            if (nowHours < THRESHOLD_LATE_NIGHT_START || nowHours > THRESHOLD_LATE_NIGHT_END) {
                println("getQuestionSmart(): SKIP LATE_NIGHT $categoryForAnswer")
                map[categoryId] = FAKE_RULE_OUT_NR
            }
        }
        if (categoryForAnswer?.isWorkDayCategory == true && !isWorkDayToday) {
            println("getQuestionSmart(): SKIP IS_WORK_DAY_CATEGORY $categoryForAnswer")
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

        map[answer.questionCategoryId] = (map[answer.questionCategoryId] ?: 0) + 1
    }

    val sortedEntries = map.entries.sortedBy { it.value }
    // effectively translates to random categories between all categories with 0 answer or less
    val nrOfEntriesForLeastUsed = sortedEntries[0].value.coerceAtLeast(0)
    val categoriesLeastUsed = sortedEntries.filter { it.value <= nrOfEntriesForLeastUsed }
    val categoryToUse = categoriesLeastUsed.random().key
    val questionsForCategory = QUESTIONS.filter { it.categoryId == categoryToUse }

    println("getQuestionSmart(): sortedEntries: $sortedEntries, nrOfEntriesForLeastUsed: $nrOfEntriesForLeastUsed, categoriesLeastUsed: $categoriesLeastUsed, categoryToUse: $categoryToUse, questionsForCategory: $questionsForCategory, isWorkDayToday: $isWorkDayToday")
    return questionsForCategory.random()
}

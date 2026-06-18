package com.minded.minded.data

import com.minded.minded.util.parseQuestionFromJSONObject
import org.json.JSONArray
import java.io.Serializable


data class Answer(
    val id: Int,
    val questionCategoryId: QuestionCategoryId,
    val questionId: String? = null,
    val txt: String,
    var createdAt: Long,
    var modifiedAt: Long
)

enum class QuestionCategoryId {
    HealthierBrowsingHabits,
    HealthierAppUsage,
    Motivation,
    PersonalResources,
    RefocusHelperToday,
    CalmingThoughts,
    PositiveThoughts,
    HelpfulTools,
    GoodPlans,
    GoodPlansToday,
    GoodToday,
    TodayILearned,
    GoalForTheWeek,
    Gratitude,
    Insomnia,
    UnderstandingProcrastination,
    SelfDiscovery,
    SelfImprovement,
    Relationships,
    MindfulEating,

    // NOTE: we filter out all questions from categories starting with X
    XEnergyLevelToday,
    XBrowsingBehaviorHappiness,

    // NO save questions
    XXPurposeOfSession,
}


data class QuestionForPrompt(
    val id: String,
    val categoryId: QuestionCategoryId,
    val t: String,
    val prompt: String? = null
) : Serializable


data class QuestionCategoryForDashboard(
    val dashboardTxt: String,
    val categoryId: QuestionCategoryId,
    val answers: List<Answer>,
    val isTodayOnlyCategory: Boolean = false,
    val isThisWeekOnlyCategory: Boolean = false,
    val isMorningCategory: Boolean = false,
    val isEveningCategory: Boolean = false,
    val isLateNightCategory: Boolean = false,
    val isWorkDayCategory: Boolean = false,
    val frequencyModifier: Int = 0
)




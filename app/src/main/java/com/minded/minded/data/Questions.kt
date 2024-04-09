package com.minded.minded.data

import com.minded.minded.data.answers.Answer
import java.io.Serializable

enum class QuestionCategoryId {
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
    XEnergyLevelToday
}

data class Question(
    val t: String,
    val prompt: String? = null
)

data class QuestionForPrompt(
    val categoryId: QuestionCategoryId,
    val t: String,
    val prompt: String? = null
) : Serializable


data class QuestionCategory(
    val dashboardTxt: String,
    val questions: List<QuestionForPrompt>?,
    val isTodayOnlyCategory: Boolean = false,
    val isThisWeekOnlyCategory: Boolean = false,
    val isMorningCategory: Boolean = false,
    val isEveningCategory: Boolean = false,
)

data class QuestionCategoryForDashboard(
    val dashboardTxt: String,
    val categoryId: QuestionCategoryId,
    val answers: List<Answer>,
    val isTodayOnlyCategory: Boolean = false,
    val isThisWeekOnlyCategory: Boolean = false,
    val isMorningCategory: Boolean = false,
    val isEveningCategory: Boolean = false,
)

//interface QuestionCategory {
//    val dashboardTxt: String?
//    val isTodayOnlyCategory: Boolean?
//    val isThisWeekOnlyCategory: Boolean?
//    val isQuestionLessWidget: Boolean?
//    val questions: List<Question>?
//}


val QUESTIONS: List<QuestionForPrompt> = listOf(
    QuestionForPrompt(
        t = "What is something you are good at",
        prompt = "I am good at",
        categoryId = QuestionCategoryId.PersonalResources
    ),
    QuestionForPrompt(
        t = "What is a strength of yours",
        categoryId = QuestionCategoryId.PersonalResources
    ),
    QuestionForPrompt(
        t = "Today I learned...",
        prompt = "I learned",
        categoryId = QuestionCategoryId.TodayILearned
    ),
    QuestionForPrompt(
        t = "What is your most important task today",
        prompt = "My most important task is",
        categoryId = QuestionCategoryId.RefocusHelperToday
    ),
    QuestionForPrompt(
        t = "What is the plan for today",
        prompt = "My plan for today is",
        categoryId = QuestionCategoryId.RefocusHelperToday
    ),
    QuestionForPrompt(
        t = "What motivates you",
        prompt = "I am motivated by",
        categoryId = QuestionCategoryId.Motivation
    ),
    QuestionForPrompt(
        t = "What is something you are grateful for",
        prompt = "I am grateful for ",
        categoryId = QuestionCategoryId.Gratitude
    ),
    QuestionForPrompt(
        t = "What might help you concentrate",
        prompt = "I can concentrate better when",
        categoryId = QuestionCategoryId.HelpfulTools
    ),
    QuestionForPrompt(
        t = "What might boost your productivity",
        prompt = "I am more productive when",
        categoryId = QuestionCategoryId.HelpfulTools
    ),
    QuestionForPrompt(
        t = "What makes you feel relaxed",
        prompt = "I feel at ease when",
        categoryId = QuestionCategoryId.CalmingThoughts
    ),
    QuestionForPrompt(
        t = "Can you describe a calm place you might like",
        categoryId = QuestionCategoryId.CalmingThoughts
    ),
    QuestionForPrompt(
        t = "What do you like",
        prompt = "I like",
        categoryId = QuestionCategoryId.PositiveThoughts
    ),
    QuestionForPrompt(
        t = "I am happy when...",
        prompt = "I am happy when",
        categoryId = QuestionCategoryId.PositiveThoughts
    ),
    QuestionForPrompt(
        t = "What is good today",
        categoryId = QuestionCategoryId.GoodToday
    ),
    QuestionForPrompt(
        t = "What is a little thing you enjoyed today",
        prompt = "I enjoyed",
        categoryId = QuestionCategoryId.GoodToday
    ),
    QuestionForPrompt(
        t = "What is something you always wanted to do",
        categoryId = QuestionCategoryId.GoodPlans
    ),
    QuestionForPrompt(
        t = "What is a good habit you might want to establish",
        prompt = "I want to ",
        categoryId = QuestionCategoryId.GoodPlans
    ),
    QuestionForPrompt(
        t = "What is a nice thing you can do for yourself today",
        categoryId = QuestionCategoryId.GoodPlansToday
    ),
    QuestionForPrompt(
        t = "What can I do so that today will be a good day",
        prompt = "I will",
        categoryId = QuestionCategoryId.GoodPlansToday
    ),
    QuestionForPrompt(
        t = "Today I will do my best to...",
        prompt = "Today I will do my best to",
        categoryId = QuestionCategoryId.GoodPlansToday
    ),
    QuestionForPrompt(
        t = "What is a goal you want to achieve this week",
        categoryId = QuestionCategoryId.GoalForTheWeek
    ),
    QuestionForPrompt(
        t = "This week I will do my best to...",
        prompt = "This week I will do my best to",
        categoryId = QuestionCategoryId.GoalForTheWeek
    )
)


val QUESTION_CATEGORIES: Map<QuestionCategoryId, QuestionCategory> = mapOf(
    QuestionCategoryId.PersonalResources to QuestionCategory(
        "Personal Resources",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.PersonalResources },
    ),
    QuestionCategoryId.TodayILearned to QuestionCategory(
        "Today I learned",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.TodayILearned },
        isTodayOnlyCategory = true,
        isEveningCategory = true,
        isMorningCategory = true,
    ),
    QuestionCategoryId.RefocusHelperToday to QuestionCategory(
        "Finding Focus Today",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.RefocusHelperToday },
        isTodayOnlyCategory = true,
        isMorningCategory = true,
    ),
    QuestionCategoryId.Motivation to QuestionCategory(
        "My Motivation",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.Motivation },
    ),
    QuestionCategoryId.Gratitude to QuestionCategory(
        "Gratitude",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.Gratitude },
    ),
    QuestionCategoryId.HelpfulTools to QuestionCategory(
        "Helpful Tools",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.HelpfulTools },
    ),
    QuestionCategoryId.CalmingThoughts to QuestionCategory(
        "Calming Thoughts",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.CalmingThoughts },
    ),
    QuestionCategoryId.PositiveThoughts to QuestionCategory(
        "Positive Thoughts",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.PositiveThoughts },
    ),
    QuestionCategoryId.GoodToday to QuestionCategory(
        "Good Today",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.GoodToday },
        isTodayOnlyCategory = true,
        isEveningCategory = true,
    ),
    QuestionCategoryId.GoodPlans to QuestionCategory(
        "Good Plans",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.GoodPlans },
    ),
    QuestionCategoryId.GoodPlansToday to QuestionCategory(
        "Good Plans Today",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.GoodPlansToday },
        isTodayOnlyCategory = true,
        isMorningCategory = true,
    ),
    QuestionCategoryId.GoalForTheWeek to QuestionCategory(
        "Your Goal for the Week",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.GoalForTheWeek },
        isThisWeekOnlyCategory = true,
    ),
    QuestionCategoryId.XEnergyLevelToday to QuestionCategory(
        "",
        null,
        isTodayOnlyCategory = true,
        isMorningCategory = true,
    )
)

val QUESTION_CATEGORIES_ON_DASHBOARD: List<QuestionCategoryId> = listOf(
    QuestionCategoryId.GoodPlansToday,
    QuestionCategoryId.RefocusHelperToday,
    QuestionCategoryId.GoodToday,
    QuestionCategoryId.TodayILearned,
    QuestionCategoryId.Motivation,
    QuestionCategoryId.XEnergyLevelToday,
    QuestionCategoryId.GoodPlans,
    QuestionCategoryId.HelpfulTools,
    QuestionCategoryId.GoalForTheWeek,
    QuestionCategoryId.PersonalResources,
    QuestionCategoryId.Gratitude,
    QuestionCategoryId.PositiveThoughts,
    QuestionCategoryId.CalmingThoughts,
)


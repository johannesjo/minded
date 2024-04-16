package com.minded.minded.data

import com.minded.minded.data.answers.Answer
import org.json.JSONArray
import java.io.Serializable


enum class QuestionCategoryId {
    Motivation,
    PersonalResources,
    RefocusHelperToday,
    CalmingThoughts,
    PositiveThoughts,
    UnderstandingProcrastination,
    SelfDiscovery,
    HelpfulTools,
    GoodPlans,
    GoodPlansToday,
    GoodToday,
    TodayILearned,
    Insomnia,
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
    val isLateNightCategory: Boolean = false,
)

data class QuestionCategoryForDashboard(
    val dashboardTxt: String,
    val categoryId: QuestionCategoryId,
    val answers: List<Answer>,
    val isTodayOnlyCategory: Boolean = false,
    val isThisWeekOnlyCategory: Boolean = false,
    val isMorningCategory: Boolean = false,
    val isEveningCategory: Boolean = false,
    val isLateNightCategory: Boolean = false,
)

//interface QuestionCategory {
//    val dashboardTxt: String?
//    val isTodayOnlyCategory: Boolean?
//    val isThisWeekOnlyCategory: Boolean?
//    val isQuestionLessWidget: Boolean?
//    val questions: List<Question>?
//}

//
//val QUESTIONS: List<QuestionForPrompt> = listOf(
//    QuestionForPrompt(
//        t = "What is something you are good at",
//        prompt = "I am good at",
//        categoryId = QuestionCategoryId.PersonalResources
//    ),
//    QuestionForPrompt(
//        t = "What is a strength of yours",
//        categoryId = QuestionCategoryId.PersonalResources
//    ),
//    QuestionForPrompt(
//        t = "Today I learned...",
//        prompt = "I learned",
//        categoryId = QuestionCategoryId.TodayILearned
//    ),
//    QuestionForPrompt(
//        t = "What is your most important task today",
//        prompt = "My most important task is",
//        categoryId = QuestionCategoryId.RefocusHelperToday
//    ),
//    QuestionForPrompt(
//        t = "What is the plan for today",
//        prompt = "My plan for today is",
//        categoryId = QuestionCategoryId.RefocusHelperToday
//    ),
//    QuestionForPrompt(
//        t = "What motivates you",
//        prompt = "I am motivated by",
//        categoryId = QuestionCategoryId.Motivation
//    ),
//    QuestionForPrompt(
//        t = "What is something you are grateful for",
//        prompt = "I am grateful for ",
//        categoryId = QuestionCategoryId.Gratitude
//    ),
//    QuestionForPrompt(
//        t = "What might help you concentrate",
//        prompt = "I can concentrate better when",
//        categoryId = QuestionCategoryId.HelpfulTools
//    ),
//    QuestionForPrompt(
//        t = "What might boost your productivity",
//        prompt = "I am more productive when",
//        categoryId = QuestionCategoryId.HelpfulTools
//    ),
//    QuestionForPrompt(
//        t = "What makes you feel relaxed",
//        prompt = "I feel at ease when",
//        categoryId = QuestionCategoryId.CalmingThoughts
//    ),
//    QuestionForPrompt(
//        t = "Can you describe a calm place you might like",
//        categoryId = QuestionCategoryId.CalmingThoughts
//    ),
//    QuestionForPrompt(
//        t = "What do you like",
//        prompt = "I like",
//        categoryId = QuestionCategoryId.PositiveThoughts
//    ),
//    QuestionForPrompt(
//        t = "I am happy when...",
//        prompt = "I am happy when",
//        categoryId = QuestionCategoryId.PositiveThoughts
//    ),
//    QuestionForPrompt(
//        t = "What is good today",
//        categoryId = QuestionCategoryId.GoodToday
//    ),
//    QuestionForPrompt(
//        t = "What is a little thing you enjoyed today",
//        prompt = "I enjoyed",
//        categoryId = QuestionCategoryId.GoodToday
//    ),
//    QuestionForPrompt(
//        t = "What is something you always wanted to do",
//        categoryId = QuestionCategoryId.GoodPlans
//    ),
//    QuestionForPrompt(
//        t = "What is a good habit you might want to establish",
//        prompt = "I want to ",
//        categoryId = QuestionCategoryId.GoodPlans
//    ),
//    QuestionForPrompt(
//        t = "What is a nice thing you can do for yourself today",
//        categoryId = QuestionCategoryId.GoodPlansToday
//    ),
//    QuestionForPrompt(
//        t = "What can I do so that today will be a good day",
//        prompt = "I will",
//        categoryId = QuestionCategoryId.GoodPlansToday
//    ),
//    QuestionForPrompt(
//        t = "Today I will do my best to...",
//        prompt = "Today I will do my best to",
//        categoryId = QuestionCategoryId.GoodPlansToday
//    ),
//    QuestionForPrompt(
//        t = "What is a goal you want to achieve this week",
//        categoryId = QuestionCategoryId.GoalForTheWeek
//    ),
//    QuestionForPrompt(
//        t = "This week I will do my best to...",
//        prompt = "This week I will do my best to",
//        categoryId = QuestionCategoryId.GoalForTheWeek
//    )
//)


val jsonString =
    """[{"t":"What is something you are good at","prompt":"I am good at","categoryId":"PersonalResources"},{"t":"What is a strength of yours","categoryId":"PersonalResources"},{"t":"Today I learned...","prompt":"I learned","categoryId":"TodayILearned"},{"t":"What is your most important task today","prompt":"My most important task is","categoryId":"RefocusHelperToday"},{"t":"What is most important today for you","prompt":"Most important is","categoryId":"RefocusHelperToday"},{"t":"What is the plan for today","prompt":"My plan for today is","categoryId":"RefocusHelperToday"},{"t":"If there was only one task I could do today, which one would it be","prompt":"My task for today would be","categoryId":"RefocusHelperToday"},{"t":"What would make me proud today, if it would finally be done","prompt":"I would be proud to","categoryId":"RefocusHelperToday"},{"t":"What small task can I do today, that will pave the way for other tasks","categoryId":"RefocusHelperToday"},{"t":"What do you want to achieve today","prompt":"Today I want to","categoryId":"RefocusHelperToday"},{"t":"What is the most easy and smallest task you could be working on now","prompt":"Right now, I can work on","categoryId":"RefocusHelperToday"},{"t":"What exactly needs to be done in your current task","prompt":"First I","categoryId":"RefocusHelperToday"},{"t":"What motivates you","prompt":"I am motivated by","categoryId":"Motivation"},{"t":"What motivates me to make progress","prompt":"I am motivated by","categoryId":"Motivation"},{"t":"What is something you are grateful for","prompt":"I am grateful for","categoryId":"Gratitude"},{"t":"What might help you concentrate","prompt":"I can concentrate better when","categoryId":"HelpfulTools"},{"t":"What might boost your productivity","prompt":"I am more productive when","categoryId":"HelpfulTools"},{"t":"What is a thing you might do instead of visiting this website","prompt":"Instead of visiting this website I","categoryId":"HelpfulTools"},{"t":"Instead of instant gratification, what might be a better alternative","prompt":"Instead of visiting these websites I could","categoryId":"HelpfulTools"},{"t":"At what time of the day can you concentrate best","prompt":"I can concentrate best","categoryId":"HelpfulTools"},{"t":"What do I need to work well in terms of light, view, order, temperature, social and physical environment","prompt":"I need","categoryId":"HelpfulTools"},{"t":"How do I stay grounded when I feel overwhelmed","prompt":"I am able to stay grounded, when","categoryId":"HelpfulTools"},{"t":"What makes you feel relaxed","prompt":"I feel at ease when","categoryId":"CalmingThoughts"},{"t":"Can you describe a calm place you might like","categoryId":"CalmingThoughts"},{"t":"What do you like","prompt":"I like","categoryId":"PositiveThoughts"},{"t":"What do you love about life","prompt":"I love","categoryId":"PositiveThoughts"},{"t":"What do you love about yourself","prompt":"I love","categoryId":"PositiveThoughts"},{"t":"I am happy when...","prompt":"I am happy when","categoryId":"PositiveThoughts"},{"t":"What accomplishments are you most proud of","prompt":"I am proud of","categoryId":"PositiveThoughts"},{"t":"What is good today","categoryId":"GoodToday"},{"t":"What is a little thing you enjoyed today","prompt":"I enjoyed","categoryId":"GoodToday"},{"t":"What is something you always wanted to do","categoryId":"GoodPlans"},{"t":"What is a good habit you might want to establish","prompt":"I want to","categoryId":"GoodPlans"},{"t":"What do you want to stop doing? And what can you do instead","prompt":"I want to stop","categoryId":"GoodPlans"},{"t":"What is a nice thing you can do for yourself today","categoryId":"GoodPlansToday"},{"t":"What can you do so that today will be a good day","prompt":"I will","categoryId":"GoodPlansToday"},{"t":"Today I will do my best to...","prompt":"Today I will do my best to","categoryId":"GoodPlansToday"},{"t":"What is a little thing you can enjoy today","prompt":"Today I will enjoy","categoryId":"GoodPlansToday"},{"t":"What is a goal you want to achieve this week","categoryId":"GoalForTheWeek"},{"t":"This week I will do my best to...","prompt":"This week I will do my best to","categoryId":"GoalForTheWeek"},{"t":"What do you think is a factor that enables your procrastination","categoryId":"UnderstandingProcrastination"},{"t":"Why are you visiting this website","categoryId":"UnderstandingProcrastination"},{"t":"Where and how do I waste time","categoryId":"UnderstandingProcrastination"},{"t":"What is hurting your focus","categoryId":"UnderstandingProcrastination"},{"t":"In what situations do you have a hard time focussing and what contributes to it","prompt":"I'm having a hard time focussing when","categoryId":"UnderstandingProcrastination"},{"t":"In what situations do I reach a Flow state? And what contributes to it","prompt":"I reach the Flow state when","categoryId":"UnderstandingProcrastination"},{"t":"What emotions are evoked by your current task","categoryId":"UnderstandingProcrastination"},{"t":"What are you feeling right now","prompt":"I feel","categoryId":"Insomnia"},{"t":"Is there something specific on your mind that you need to address or resolve before trying to sleep","categoryId":"Insomnia"},{"t":"Are there any unresolved tasks or worries that you can address tomorrow, rather than ruminating on them tonight","categoryId":"Insomnia"},{"t":"What can you do to make yourself more comfortable in this moment","categoryId":"Insomnia"},{"t":"Am I using my time wisely","categoryId":"SelfDiscovery"},{"t":"What do I want in life","categoryId":"SelfDiscovery"},{"t":"I feel most energized when","categoryId":"SelfDiscovery"},{"t":"Am I employing a healthy perspective","categoryId":"SelfDiscovery"},{"t":"What skills do you want to learn in the next five years","categoryId":"SelfDiscovery"},{"t":"Am I letting matters that are out of my control stress me out","categoryId":"SelfDiscovery"},{"t":"Is where I am today making me happy","categoryId":"SelfDiscovery"},{"t":"My favorite way to spend the day is...","categoryId":"SelfDiscovery"},{"t":"The words I’d like to live by are...","categoryId":"SelfDiscovery"},{"t":"If my body could talk, it would say...","categoryId":"SelfDiscovery"},{"t":"What actions, if taken, would make me proud of myself, regardless of the outcome?","categoryId":"SelfDiscovery"},{"t":"What is the biggest “What if” in your mind","categoryId":"SelfDiscovery"},{"t":"If I could talk to my teenage self, the one thing I would say is...","categoryId":"SelfDiscovery"}]"""
val jsonArray = JSONArray(jsonString)

val QUESTIONS = List(jsonArray.length()) { i ->
    val jsonObject = jsonArray.getJSONObject(i)
    val t = jsonObject.getString("t")
    val prompt = jsonObject.optString("prompt", null)
    val categoryId = QuestionCategoryId.valueOf(jsonObject.getString("categoryId"))
    QuestionForPrompt(categoryId, t, prompt)
}

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
        isMorningCategory = true,
    ),
    QuestionCategoryId.Gratitude to QuestionCategory(
        "Gratitude",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.Gratitude },
    ),
    QuestionCategoryId.HelpfulTools to QuestionCategory(
        "Helpful Tools",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.HelpfulTools },
        isMorningCategory = true,
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
        isMorningCategory = true,
        isThisWeekOnlyCategory = true,
    ),
    QuestionCategoryId.UnderstandingProcrastination to QuestionCategory(
        "Understanding Procrastination",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.UnderstandingProcrastination },
        isMorningCategory = true,
    ),
    QuestionCategoryId.SelfDiscovery to QuestionCategory(
        dashboardTxt = "Self Discovery",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.SelfDiscovery },
    ),
    QuestionCategoryId.Insomnia to QuestionCategory(
        dashboardTxt = "Insomnia",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.Insomnia },
        isLateNightCategory = true,
        isTodayOnlyCategory = true,
    ),
    QuestionCategoryId.XEnergyLevelToday to QuestionCategory(
        "",
        null,
        isTodayOnlyCategory = true,
        isMorningCategory = true,
    ),
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
    QuestionCategoryId.UnderstandingProcrastination,
    QuestionCategoryId.SelfDiscovery,
    QuestionCategoryId.Insomnia,
    QuestionCategoryId.PositiveThoughts,
    QuestionCategoryId.CalmingThoughts,
)


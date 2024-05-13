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
    val id: String,
    val t: String,
    val prompt: String? = null
)

data class QuestionForPrompt(
    val id: String,
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
    val isWorkDayCategory: Boolean = false,
    val frequencyModifier: Int = 0
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
    val isWorkDayCategory: Boolean = false,
    val frequencyModifier: Int = 0
)


val jsonString =
    """[{"id":"PR1","t":"What is something you are good at","prompt":"I am good at","categoryId":"PersonalResources"},{"id":"PR2","t":"What is a strength of yours","categoryId":"PersonalResources"},{"id":"TIL1","t":"Today I learned...","prompt":"I learned","categoryId":"TodayILearned"},{"id":"RFHT1","t":"What is your most important task today","prompt":"My most important task is","categoryId":"RefocusHelperToday"},{"id":"RFHT2","t":"What is most important today for you","prompt":"Most important is","categoryId":"RefocusHelperToday"},{"id":"RFHT3","t":"What is the plan for today","prompt":"My plan for today is","categoryId":"RefocusHelperToday"},{"id":"RFHT4","t":"If there was only one task I could do today, which one would it be","prompt":"Most important is","categoryId":"RefocusHelperToday"},{"id":"RFHT5","t":"What would make me proud today, if it would finally be done","prompt":"I would be proud to","categoryId":"RefocusHelperToday"},{"id":"RFHT6","t":"What small task can I do today, that will pave the way for other tasks","categoryId":"RefocusHelperToday"},{"id":"RFHT7","t":"What do you want to achieve today","prompt":"Today I want to","categoryId":"RefocusHelperToday"},{"id":"RFHT8","t":"What is the most easy and smallest task you could be working on now","prompt":"Right now, I can work on","categoryId":"RefocusHelperToday"},{"id":"RFHT9","t":"What exactly needs to be done in your current task","prompt":"First I","categoryId":"RefocusHelperToday"},{"id":"RFHT10","t":"Instead of instant gratification, what might be a better alternative","prompt":"Instead of visiting these websites I could","categoryId":"RefocusHelperToday"},{"id":"MO1","t":"What motivates you","prompt":"I am motivated by","categoryId":"Motivation"},{"id":"MO2","t":"What motivates me to make progress","prompt":"I am motivated by","categoryId":"Motivation"},{"id":"GR1","t":"What is something you are grateful for","prompt":"I am grateful for","categoryId":"Gratitude"},{"id":"HT1","t":"What might help you concentrate","prompt":"I can concentrate better when","categoryId":"HelpfulTools"},{"id":"HT2","t":"What might boost your productivity","prompt":"I am more productive when","categoryId":"HelpfulTools"},{"id":"HT3","t":"What is a thing you might do instead of visiting this website","prompt":"Instead of visiting this website I","categoryId":"HelpfulTools"},{"id":"HT4","t":"At what time of the day can you concentrate best","prompt":"I can concentrate best","categoryId":"HelpfulTools"},{"id":"HT5","t":"What do I need to work well in terms of light, order, temperature, social and physical environment","prompt":"I need","categoryId":"HelpfulTools"},{"id":"HT6","t":"How do I stay grounded when I feel overwhelmed","prompt":"I am able to stay grounded, when","categoryId":"HelpfulTools"},{"id":"CT1","t":"What makes you feel relaxed","prompt":"I feel at ease when","categoryId":"CalmingThoughts"},{"id":"CT2","t":"Can you describe a calm place you might like","categoryId":"CalmingThoughts"},{"id":"PT1","t":"What do you like","prompt":"I like","categoryId":"PositiveThoughts"},{"id":"PT2","t":"What do you love about life","prompt":"I love","categoryId":"PositiveThoughts"},{"id":"PT3","t":"What do you love about yourself","prompt":"I love","categoryId":"PositiveThoughts"},{"id":"PT4","t":"I am happy when...","prompt":"I am happy when","categoryId":"PositiveThoughts"},{"id":"PT5","t":"What accomplishments are you most proud of","prompt":"I am proud of","categoryId":"PositiveThoughts"},{"id":"GT1","t":"What is good today","categoryId":"GoodToday"},{"id":"GT2","t":"What is a little thing you enjoyed today","prompt":"I enjoyed","categoryId":"GoodToday"},{"id":"GP1","t":"What is something you always wanted to do","categoryId":"GoodPlans"},{"id":"GP2","t":"What is a good habit you might want to establish","prompt":"I want to","categoryId":"GoodPlans"},{"id":"GP3","t":"What do you want to stop doing? And what can you do instead","prompt":"I want to stop","categoryId":"GoodPlans"},{"id":"GPT1","t":"What is a nice thing you can do for yourself today","categoryId":"GoodPlansToday"},{"id":"GPT2","t":"What can you do so that today will be a good day","prompt":"I will","categoryId":"GoodPlansToday"},{"id":"GPT3","t":"Today I will do my best to...","prompt":"Today I will do my best to","categoryId":"GoodPlansToday"},{"id":"GPT4","t":"What is a little thing you can enjoy today","prompt":"Today I will enjoy","categoryId":"GoodPlansToday"},{"id":"GPT5","t":"What kind of person do I want to be today","prompt":"Today I will enjoy","categoryId":"GoodPlansToday"},{"id":"GW1","t":"What is a goal you want to achieve this week","categoryId":"GoalForTheWeek"},{"id":"GW2","t":"This week I will do my best to...","prompt":"This week I will do my best to","categoryId":"GoalForTheWeek"},{"id":"UP1","t":"What do you think is a factor that enables your procrastination","categoryId":"UnderstandingProcrastination"},{"id":"UP2","t":"Why are you visiting this website","categoryId":"UnderstandingProcrastination"},{"id":"UP3","t":"Where and how do I waste time","categoryId":"UnderstandingProcrastination"},{"id":"UP4","t":"What is hurting your focus","categoryId":"UnderstandingProcrastination"},{"id":"UP5","t":"In what situations do you have a hard time focussing and what contributes to it","prompt":"I find it hard to focus, when","categoryId":"UnderstandingProcrastination"},{"id":"UP6","t":"In what situations do I reach a Flow state? And what contributes to it","prompt":"I reach the Flow state when","categoryId":"UnderstandingProcrastination"},{"id":"UP7","t":"What emotions are evoked by your current task","categoryId":"UnderstandingProcrastination"},{"id":"IN1","t":"What are you feeling right now","prompt":"I feel","categoryId":"Insomnia"},{"id":"IN2","t":"Is there something specific on your mind that you need to address or resolve before trying to sleep","categoryId":"Insomnia"},{"id":"IN3","t":"Are there any unresolved tasks or worries that you can address tomorrow, rather than ruminating on them tonight","categoryId":"Insomnia"},{"id":"IN4","t":"What can you do to make yourself more comfortable in this moment","categoryId":"Insomnia"},{"id":"IN5","t":"What other things could you do to wind down before sleep","categoryId":"Insomnia"},{"id":"SD1","t":"Are you using my time wisely","categoryId":"SelfDiscovery"},{"id":"SD2","t":"What do you want in life","categoryId":"SelfDiscovery"},{"id":"SD3","t":"You feel most energized when...","categoryId":"SelfDiscovery"},{"id":"SD4","t":"Imagine you’ve discovered a hidden door in your home that leads to an alternate dimension. What would you write on a message you’d leave for yourself before stepping through, detailing what you hope to find and any concerns you have","categoryId":"SelfDiscovery"},{"id":"SD5","t":"What skills do you want to learn in the next five years","categoryId":"SelfDiscovery"},{"id":"SD6","t":"Are you letting matters that are out of your control stress me out","categoryId":"SelfDiscovery"},{"id":"SD7","t":"Is where you are today making you happy","categoryId":"SelfDiscovery"},{"id":"SD8","t":"My favorite way to spend the day is...","categoryId":"SelfDiscovery"},{"id":"SD9","t":"The words I’d like to live by are...","categoryId":"SelfDiscovery"},{"id":"SD10","t":"If my body could talk, it would say...","categoryId":"SelfDiscovery"},{"id":"SD11","t":"What actions would make me proud of myself","categoryId":"SelfDiscovery"},{"id":"SD12","t":"What is the biggest “What if” in your mind","categoryId":"SelfDiscovery"},{"id":"SD13","t":"If you could talk to your teenage self, the one thing you would say is...","categoryId":"SelfDiscovery"},{"id":"SD14","t":"Do you live a fulfilling life","categoryId":"SelfDiscovery"},{"id":"SD15","t":"What is your purpose","categoryId":"SelfDiscovery"},{"id":"SD16","t":"Why are you here","categoryId":"SelfDiscovery"}]
"""
val jsonArray = JSONArray(jsonString)

val QUESTIONS = List(jsonArray.length()) { i ->
    val jsonObject = jsonArray.getJSONObject(i)
    parseQuestionFromJSONObject(jsonObject)
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
        isWorkDayCategory = true,
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
        isWorkDayCategory = true,
        frequencyModifier = 1,
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
        isWorkDayCategory = true,
    ),
    QuestionCategoryId.UnderstandingProcrastination to QuestionCategory(
        "Understanding Procrastination",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.UnderstandingProcrastination },
        isMorningCategory = true,
        isWorkDayCategory = true,
    ),
    QuestionCategoryId.SelfDiscovery to QuestionCategory(
        dashboardTxt = "Self Discovery",
        QUESTIONS.filter { it.categoryId == QuestionCategoryId.SelfDiscovery },
        frequencyModifier = 2,
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


export enum QuestionCategoryId {
  Motivation = "Motivation",
  PersonalResources = "PersonalResources",
  RefocusHelperToday = "RefocusHelperToday",
  CalmingThoughts = "CalmingThoughts",
  PositiveThoughts = "PositiveThoughts",
  HelpfulTools = "HelpfulTools",
  GoodPlans = "GoodPlans",
  GoodPlansToday = "GoodPlansToday",
  GoodToday = "GoodToday",
  TodayILearned = "TodayILearned",
  GoalForTheWeek = "GoalForTheWeek",
  Gratitude = "Gratitude",
  Insomnia = "Insomnia",
  UnderstandingProcrastination = "UnderstandingProcrastination",
  SelfDiscovery = "SelfDiscovery",
  // NOTE: we filter out all questions from categories starting with X
  XEnergyLevelToday = "XEnergyLevelToday",
  XPurposeOfSession = "XPurposeOfSession",
  // IDEAS
  // ---------
  // XSpecialWidget = "XSpecialWidget",
  // XMoodWordCloud = "XMoodWordCloud",
  // XMoodColorSelector = "XMoodColorSelector",
  // XWeatherSelector = "XWeatherSelector",
  // FlowBreaker = "FlowBreaker",
  // Other = "Other",
  // SelfCompassion = "SelfCompassion",
}

export const SPECIAL_WIDGET_LETTER = "X";
export const filterSpecialWidgets = (categoryId: QuestionCategoryId): boolean =>
  categoryId[0] !== SPECIAL_WIDGET_LETTER;

export type Question = {
  t: string;
  prompt?: string;
};

export type QuestionForPrompt = {
  categoryId: QuestionCategoryId;
  t: string;
  prompt?: string;
};

export interface QuestionCategory {
  dashboardTxt?: string;
  isTodayOnlyCategory?: boolean;
  isThisWeekOnlyCategory?: boolean;
  isMorningCategory?: boolean;
  isEveningCategory?: boolean;
  isLateNightCategory?: boolean;
  isDontSaveQuestion?: boolean;
  questions?: Question[];
  specialQuestions?: Question[];
}

export const QUESTION_CATEGORIES: {
  [key in QuestionCategoryId]: QuestionCategory;
} = {
  [QuestionCategoryId.PersonalResources]: {
    dashboardTxt: "Personal Resources",
    questions: [
      { t: "What is something you are good at", prompt: "I am good at" },
      {
        t: "What is a strength of yours",
      },
    ],
  },
  [QuestionCategoryId.TodayILearned]: {
    isTodayOnlyCategory: true,
    isEveningCategory: true,
    dashboardTxt: "Today I learned",
    questions: [{ t: "Today I learned...", prompt: "I learned" }],
  },
  [QuestionCategoryId.RefocusHelperToday]: {
    isTodayOnlyCategory: true,
    isMorningCategory: true,
    dashboardTxt: "Finding Focus Today",
    questions: [
      {
        t: "What is your most important task today",
        prompt: "My most important task is",
      },
      {
        t: "What is most important today for you",
        prompt: "Most important is",
      },
      {
        t: "What is the plan for today",
        prompt: "My plan for today is",
      },
      {
        t: "If there was only one task I could do today, which one would it be",
        prompt: "My task for today would be",
      },
      {
        t: "What would make me proud today, if it would finally be done",
        prompt: "I would be proud to",
      },
      {
        t: "What small task can I do today, that will pave the way for other tasks",
      },
      {
        t: "What do you want to achieve today",
        prompt: "Today I want to",
      },
      {
        t: "What is the most easy and smallest task you could be working on now",
        prompt: "Right now, I can work on",
      },
      {
        t: "What exactly needs to be done in your current task",
        prompt: "First I",
      },
    ],
  },
  [QuestionCategoryId.Motivation]: {
    dashboardTxt: "My Motivation",
    questions: [
      { t: "What motivates you", prompt: "I am motivated by" },
      {
        t: "What motivates me to make progress",
        prompt: "I am motivated by",
      },
    ],
  },
  [QuestionCategoryId.Gratitude]: {
    dashboardTxt: "Gratitude",
    questions: [
      {
        t: "What is something you are grateful for",
        prompt: "I am grateful for",
      },
    ],
  },
  [QuestionCategoryId.HelpfulTools]: {
    dashboardTxt: "Helpful Tools",
    questions: [
      {
        t: "What might help you concentrate",
        prompt: "I can concentrate better when",
      },
      {
        t: "What might boost your productivity",
        prompt: "I am more productive when",
      },
      {
        t: "What is a thing you might do instead of visiting this website",
        prompt: "Instead of visiting this website I",
      },
      {
        t: "Instead of instant gratification, what might be a better alternative",
        prompt: "Instead of visiting these websites I could",
      },
      {
        t: "At what time of the day can you concentrate best",
        prompt: "I can concentrate best",
      },
      {
        t: "What do I need to work well in terms of light, view, order, temperature, social and physical environment",
        prompt: "I need",
      },
      {
        t: "How do I stay grounded when I feel overwhelmed",
        prompt: "I am able to stay grounded, when",
      },
    ],
  },
  [QuestionCategoryId.CalmingThoughts]: {
    questions: [
      { t: "What makes you feel relaxed", prompt: "I feel at ease when" },
      { t: "Can you describe a calm place you might like" },
    ],
    dashboardTxt: "Calming Thoughts",
  },
  [QuestionCategoryId.PositiveThoughts]: {
    questions: [
      { t: "What do you like", prompt: "I like" },
      { t: "What do you love about life", prompt: "I love" },
      { t: "What do you love about yourself", prompt: "I love" },
      { t: "I am happy when...", prompt: "I am happy when" },
      {
        t: "What accomplishments are you most proud of",
        prompt: "I am proud of",
      },
    ],
    dashboardTxt: "Positive Thoughts",
  },
  [QuestionCategoryId.GoodToday]: {
    isTodayOnlyCategory: true,
    isEveningCategory: true,
    questions: [
      { t: "What is good today" },
      { t: "What is a little thing you enjoyed today", prompt: "I enjoyed" },
    ],
    dashboardTxt: "Good Today",
  },
  [QuestionCategoryId.GoodPlans]: {
    questions: [
      { t: "What is something you always wanted to do" },
      {
        t: "What is a good habit you might want to establish",
        prompt: "I want to",
      },
      {
        t: "What do you want to stop doing? And what can you do instead",
        prompt: "I want to stop",
      },
    ],
    dashboardTxt: "Good Plans",
  },
  [QuestionCategoryId.GoodPlansToday]: {
    isTodayOnlyCategory: true,
    isMorningCategory: true,
    questions: [
      {
        t: "What is a nice thing you can do for yourself today",
      },
      {
        t: "What can you do so that today will be a good day",
        prompt: "I will",
      },
      {
        t: "Today I will do my best to...",
        prompt: "Today I will do my best to",
      },
      {
        t: "What is a little thing you can enjoy today",
        prompt: "Today I will enjoy",
      },
    ],
    dashboardTxt: "Good Plans Today",
  },
  [QuestionCategoryId.GoalForTheWeek]: {
    isThisWeekOnlyCategory: true,
    isMorningCategory: true,
    questions: [
      { t: "What is a goal you want to achieve this week" },
      {
        t: "This week I will do my best to...",
        prompt: "This week I will do my best to",
      },
    ],
    dashboardTxt: "Your Goal for the Week",
  },
  [QuestionCategoryId.UnderstandingProcrastination]: {
    questions: [
      { t: "What do you think is a factor that enables your procrastination" },
      { t: "Why are you visiting this website" },
      { t: "Where and how do I waste time" },
      { t: "What is hurting your focus" },
      {
        t: "In what situations do you have a hard time focussing and what contributes to it",
        prompt: "I'm having a hard time focussing when",
      },
      {
        t: "In what situations do I reach a Flow state? And what contributes to it",
        prompt: "I reach the Flow state when",
      },
      {
        t: "What emotions are evoked by your current task",
      },
    ],
    dashboardTxt: "Understanding Procrastination",
  },
  [QuestionCategoryId.Insomnia]: {
    questions: [
      { t: "What are you feeling right now", prompt: "I feel" },
      {
        t: "Is there something specific on your mind that you need to address or resolve before trying to sleep",
      },
      {
        t: "Are there any unresolved tasks or worries that you can address tomorrow, rather than ruminating on them tonight",
      },
      {
        t: "What can you do to make yourself more comfortable in this moment",
      },
    ],
    isLateNightCategory: true,
    isTodayOnlyCategory: true,
    dashboardTxt: "Insomnia",
  },
  [QuestionCategoryId.XEnergyLevelToday]: {
    isTodayOnlyCategory: true,
  },
  [QuestionCategoryId.SelfDiscovery]: {
    questions: [
      { t: "Am I using my time wisely" },
      { t: "What do I want in life" },
      { t: "I feel most energized when" },
      { t: "Am I employing a healthy perspective" },
      { t: "What skills do you want to learn in the next five years" },
      { t: "Am I letting matters that are out of my control stress me out" },
      { t: "Is where I am today making me happy" },
      { t: "My favorite way to spend the day is..." },
      { t: "The words I’d like to live by are..." },
      { t: "If my body could talk, it would say..." },
      {
        t: "What actions, if taken, would make me proud of myself, regardless of the outcome?",
      },
      { t: "What is the biggest “What if” in your mind" },
      {
        t: "If I could talk to my teenage self, the one thing I would say is...",
      },
    ],
  },
  [QuestionCategoryId.XPurposeOfSession]: {
    isTodayOnlyCategory: true,
    isDontSaveQuestion: true,
    questions: [
      {
        t: "What is the purpose of visiting this website",
        prompt: "In this session I want to",
      },
    ],
  },
};

export const QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
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
];

export const QUESTIONS: QuestionForPrompt[] = [];
Object.keys(QUESTION_CATEGORIES)
  // NOTE: we filter out all questions from categories starting with X
  .filter(filterSpecialWidgets)
  .forEach((categoryId) => {
    const entry = QUESTION_CATEGORIES[categoryId];
    entry.questions?.forEach((question) => {
      QUESTIONS.push({ ...question, categoryId });
    });
  });

// console.log(JSON.stringify(QUESTIONS));

/*
IDEAS:
      {
        t: "Why do you want to complete your current task",
        prompt: "Completing my current task, will allow me to",
      },


 */

/*
FOR LATER:
What kind of person do I want to be today?
What situations make me feel terrible, and what do they have in common?
When am I at my best?
If I change nothing, what will your life look like three months from now? How does this make me feel?
What actions, if taken, would make me proud of myself, regardless of the outcome?
When negative thoughts arise, how do I deal with them?


 */

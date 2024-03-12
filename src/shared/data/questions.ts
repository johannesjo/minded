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
  GoalForTheWeek = "GoalForTheWeek",
  Gratitude = "Gratitude",
  XEnergyLevelToday = "XEnergyLevelToday",
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
  questions?: Question[];
}

export const QUESTION_CATEGORIES: {
  [key in QuestionCategoryId]: QuestionCategory;
} = {
  [QuestionCategoryId.PersonalResources]: {
    dashboardTxt: "Personal Resources",
    questions: [
      { prompt: "I am good at", t: "What is something you are good at" },
      {
        t: "What is a strength of yours",
      },
    ],
  },
  [QuestionCategoryId.RefocusHelperToday]: {
    isTodayOnlyCategory: true,
    dashboardTxt: "Finding Focus Today",
    questions: [
      {
        prompt: "My most important task is",
        t: "What is your most important task today",
      },
      {
        prompt: "My plan for today is",
        t: "What is the plan for today",
      },
    ],
  },
  [QuestionCategoryId.Motivation]: {
    dashboardTxt: "My Motivation",
    questions: [{ t: "What motivates you" }],
  },
  [QuestionCategoryId.Gratitude]: {
    dashboardTxt: "Gratitude",
    questions: [
      {
        t: "What is something you are grateful for",
        prompt: "I am grateful for ",
      },
    ],
  },
  [QuestionCategoryId.HelpfulTools]: {
    dashboardTxt: "Helpful Tools",
    questions: [
      { t: "What might help you concentrate" },
      { t: "What might boost your productivity" },
    ],
  },
  [QuestionCategoryId.CalmingThoughts]: {
    questions: [
      { t: "What makes you feel relaxed" },
      { t: "Can you describe a calm place you might like" },
    ],
    dashboardTxt: "Calming Thoughts",
  },
  [QuestionCategoryId.PositiveThoughts]: {
    questions: [{ t: "What do you like" }],
    dashboardTxt: "Positive Thoughts",
  },
  [QuestionCategoryId.GoodToday]: {
    isTodayOnlyCategory: true,
    questions: [
      { t: "What is good today" },
      { t: "What is a little thing you enjoyed today" },
    ],
    dashboardTxt: "Good Today",
  },
  [QuestionCategoryId.GoodPlans]: {
    questions: [
      { t: "What is something you always wanted to do" },
      {
        t: "What is a good habit you might want to establish",
        prompt: "I want to ",
      },
    ],
    dashboardTxt: "Good Plans",
  },
  [QuestionCategoryId.GoodPlansToday]: {
    isTodayOnlyCategory: true,
    questions: [
      { t: "What is a nice thing you can do for yourself today" },
      { t: "What can I do so that today will be a good day", prompt: "I will" },
    ],
    dashboardTxt: "Good Plans Today",
  },
  [QuestionCategoryId.GoalForTheWeek]: {
    isThisWeekOnlyCategory: true,
    questions: [{ t: "What is a goal you want to achieve this week" }],
    dashboardTxt: "Your Goal for the Week",
  },
  [QuestionCategoryId.XEnergyLevelToday]: {
    isTodayOnlyCategory: true,
  },
};

export const QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.RefocusHelperToday,
  QuestionCategoryId.GoodToday,
  QuestionCategoryId.Motivation,
  QuestionCategoryId.XEnergyLevelToday,
  QuestionCategoryId.GoodPlans,
  QuestionCategoryId.HelpfulTools,
  QuestionCategoryId.GoalForTheWeek,
  QuestionCategoryId.PersonalResources,
  QuestionCategoryId.Gratitude,
  QuestionCategoryId.PositiveThoughts,
  QuestionCategoryId.CalmingThoughts,
];

export const QUESTIONS: QuestionForPrompt[] = [];
Object.keys(QUESTION_CATEGORIES).forEach((categoryId) => {
  const entry = QUESTION_CATEGORIES[categoryId];
  entry.questions?.forEach((question) => {
    QUESTIONS.push({ ...question, categoryId });
  });
});

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
  XEnergyLevel = "XEnergyLevel",
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
  questions: Question[];
}

export const QUESTION_CATEGORIES: {
  [key in QuestionCategoryId]: QuestionCategory;
} = {
  [QuestionCategoryId.PersonalResources]: {
    dashboardTxt: "Personal Resources",
    questions: [
      {prompt: "I am good at", t: "What are you good at"},
      {
        t: "What is a strength of yours",
      },
    ],
  },
  [QuestionCategoryId.RefocusHelperToday]: {
    dashboardTxt: "Finding Focus Today",
    isTodayOnlyCategory: true,
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
    questions: [{t: "What motivates you"}],
  },
  [QuestionCategoryId.HelpfulTools]: {
    dashboardTxt: "Helpful Tools",
    questions: [{t: "What helps you concentrate"}],
  },
  [QuestionCategoryId.CalmingThoughts]: {
    questions: [{t: "What is relaxing for you"}],
    dashboardTxt: "Calming Thoughts",
  },
  [QuestionCategoryId.PositiveThoughts]: {
    questions: [{t: "What do you like"}],
    dashboardTxt: "Positive Thoughts",
  },
  [QuestionCategoryId.GoodToday]: {
    questions: [{t: "What is good today"}],
    dashboardTxt: "Good Today",
    isTodayOnlyCategory: true,
  },
  [QuestionCategoryId.GoodPlans]: {
    questions: [{t: "What is something you always wanted to do"},],
    dashboardTxt: "Good Plans",
  },
  [QuestionCategoryId.GoodPlansToday]: {
    questions: [{t: "What is a nice thing you can do for yourself today"}],
    dashboardTxt: "Good Plans Today",
    isTodayOnlyCategory: true
  },
  [QuestionCategoryId.GoalForTheWeek]: {
    questions: [{t: "What is a goal you want to achieve this week"}],
    dashboardTxt: "Your Goal for the Week",
    isThisWeekOnlyCategory: true
  },
  [QuestionCategoryId.XEnergyLevel]: {questions: [], isTodayOnlyCategory: true},
};

export const QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.RefocusHelperToday,
  QuestionCategoryId.GoodToday,
  QuestionCategoryId.Motivation,
  QuestionCategoryId.XEnergyLevel,
  QuestionCategoryId.CalmingThoughts,
  QuestionCategoryId.GoodPlans,
  QuestionCategoryId.HelpfulTools,
  QuestionCategoryId.GoalForTheWeek,
  QuestionCategoryId.PersonalResources,
  QuestionCategoryId.PositiveThoughts,
];

export const QUESTIONS: QuestionForPrompt[] = [];
Object.keys(QUESTION_CATEGORIES).forEach((categoryId) => {
  const entry = QUESTION_CATEGORIES[categoryId];
  entry.questions.forEach((question) => {
    QUESTIONS.push({...question, categoryId});
  });
});

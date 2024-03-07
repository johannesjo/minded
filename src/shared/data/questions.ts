export enum QuestionCategoryId {
  Motivation = "Motivation",
  PersonalResources = "PersonalResources",
  RefocusHelperToday = "RefocusHelperToday",
  SelfCompassion = "SelfCompassion",
  CalmingThoughts = "CalmingThoughts",
  PositiveThoughts = "PositiveThoughts",
  HelpfulTools = "HelpfulTools",
  FlowBreaker = "FlowBreaker",
  GoodPlans = "GoodPlans",
  GoodPlansToday = "GoodPlansToday",
  XSpecialWidget = "XSpecialWidget",
  // XMoodWordCloud = "XMoodWordCloud",
  // XMoodColorSelector = "XMoodColorSelector",
  // XEnergyLevel = "XEnergyLevel",
  // XWeatherSelector = "XWeatherSelector",
  Other = "Other",
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
    dashboardTxt: "Motivation",
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
    questions: [{t: "What is good today"}, {t: "What do you like"}],
    dashboardTxt: "Positive Thoughts",
  },
  [QuestionCategoryId.SelfCompassion]: {
    questions: [],
    dashboardTxt: "Self Compassion",
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
  [QuestionCategoryId.FlowBreaker]: {questions: []},
  [QuestionCategoryId.XSpecialWidget]: {questions: []},
  [QuestionCategoryId.Other]: {questions: []},
};

export const QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.Motivation,
  QuestionCategoryId.RefocusHelperToday,
  QuestionCategoryId.PersonalResources,
  QuestionCategoryId.SelfCompassion,
  QuestionCategoryId.CalmingThoughts,
  QuestionCategoryId.GoodPlans,
  QuestionCategoryId.PositiveThoughts,
  QuestionCategoryId.XSpecialWidget,
  QuestionCategoryId.HelpfulTools,
];

export const QUESTIONS: QuestionForPrompt[] = [];
Object.keys(QUESTION_CATEGORIES).forEach((categoryId) => {
  const entry = QUESTION_CATEGORIES[categoryId];
  entry.questions.forEach((question) => {
    QUESTIONS.push({...question, categoryId});
  });
});

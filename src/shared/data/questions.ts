export enum QuestionCategoryId {
  Motivation = "Motivation",
  PersonalResources = "PersonalResources",
  RefocusHelper = "RefocusHelper",
  SelfCompassion = "SelfCompassion",
  CalmingThoughts = "CalmingThoughts",
  PositiveThoughts = "PositiveThoughts",
  HelpfulTools = "HelpfulTools",
  FlowBreaker = "FlowBreaker",
  XSpecialWidget = "XSpecialWidget",
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
  questions: Question[];
}

export const QUESTION_CATEGORIES: {
  [key in QuestionCategoryId]: QuestionCategory;
} = {
  [QuestionCategoryId.PersonalResources]: {
    dashboardTxt: "Personal Resources",
    questions: [
      { prompt: "I am good at", t: "What are you good at" },
      {
        t: "What is a strength of yours",
      },
    ],
  },
  [QuestionCategoryId.RefocusHelper]: {
    dashboardTxt: "Finding Focus",
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
    questions: [{ t: "What motivates you" }],
  },
  [QuestionCategoryId.HelpfulTools]: {
    dashboardTxt: "Helpful Tools",
    questions: [{ t: "What helps you concentrate" }],
  },
  [QuestionCategoryId.CalmingThoughts]: {
    questions: [{ t: "What is relaxing for you" }],
    dashboardTxt: "Calming Thoughts",
  },
  [QuestionCategoryId.PositiveThoughts]: {
    questions: [{ t: "What is good today" }, { t: "What do you like" }],
    dashboardTxt: "Positive Thoughts",
  },
  [QuestionCategoryId.SelfCompassion]: {
    questions: [],
    dashboardTxt: "Good Thoughts",
  },
  [QuestionCategoryId.FlowBreaker]: { questions: [] },
  [QuestionCategoryId.XSpecialWidget]: { questions: [] },
  [QuestionCategoryId.Other]: { questions: [] },
};

export const QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.Motivation,
  QuestionCategoryId.PersonalResources,
  QuestionCategoryId.RefocusHelper,
  QuestionCategoryId.SelfCompassion,
  QuestionCategoryId.XSpecialWidget,
  QuestionCategoryId.CalmingThoughts,
  QuestionCategoryId.PositiveThoughts,
  QuestionCategoryId.HelpfulTools,
];

export const QUESTIONS: QuestionForPrompt[] = [];
Object.keys(QUESTION_CATEGORIES).forEach((categoryId) => {
  const entry = QUESTION_CATEGORIES[categoryId];
  entry.questions.forEach((question) => {
    QUESTIONS.push({ ...question, categoryId });
  });
});

// @ts-ignore - path alias resolved at build time based on platform
import { IS_APP, IS_WEB_EXT } from "@dataInterface/system";

import { QID } from "@src/shared/data/questionId";

export enum QuestionCategoryId {
  HealthierBrowsingHabits = "HealthierBrowsingHabits",
  HealthierAppUsage = "HealthierAppUsage",
  WhyReduceBrowsing = "WhyReduceBrowsing",
  WhyReduceAppUsage = "WhyReduceAppUsage",
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

  // TODO add self improvement category
  // TODO add relationships category
  // TODO add mindful eating category

  XMoodCheckin = "XMoodCheckin",
  XEnergyLevelToday = "XEnergyLevelToday",
  XBrowsingBehaviorHappiness = "XBrowsingBehaviorHappiness",
  XAppUsageHappiness = "XAppUsageHappiness",
  XSelfAssessment = "XSelfAssessment",
  XEmotionLabeling = "XEmotionLabeling",

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

export type LimitTo = "BrowserExtension" | "MobileApp";
export type LimitToOpts = LimitTo[];
export const SPECIAL_WIDGET_LETTER = "X";
export const filterSpecialWidgets = (categoryId: QuestionCategoryId): boolean =>
  categoryId[0] !== SPECIAL_WIDGET_LETTER;

export interface Question {
  t: string;
  id: QID;
  prompt?: string;
  limitTo?: LimitToOpts;
  isSkipOnDashboard?: boolean;
  isDontSaveAnswer?: boolean;
}

export interface QuestionForPrompt extends Question {
  categoryId: QuestionCategoryId;
}

export interface QuestionCategory {
  dashboardTxt: string;
  /**
   * Adjusts how often questions from this category appear.
   * - Positive values (1, 2): Category appears more frequently
   * - Negative values (-1): Category appears less frequently
   * - 0 or undefined: Default frequency (no adjustment)
   * Higher absolute values = stronger effect.
   */
  frequencyModifier?: number;
  isTodayOnlyCategory?: boolean;
  isThisWeekOnlyCategory?: boolean;
  isMorningCategory?: boolean;
  isEveningCategory?: boolean;
  isLateNightCategory?: boolean;
  isWorkDayCategory?: boolean;
  isSkipOnDashboard?: boolean;
  limitTo?: LimitToOpts;
  questions?: Question[];
  specialQuestions?: Question[];
}

export const QUESTION_CATEGORIES: {
  [key in QuestionCategoryId]: QuestionCategory;
} = {
  [QuestionCategoryId.HealthierBrowsingHabits]: {
    dashboardTxt: "Healthier Browsing Habits",
    frequencyModifier: 2,
    limitTo: ["BrowserExtension"],
    questions: [
      {
        id: QID.HBH1,
        t: "What is the one thing you find most problematic in your recent browsing behavior",
        prompt: "The biggest challenge is",
      },
      {
        id: QID.HBH2,
        t: "What would you like to change in your browsing behavior",
        prompt: "I want to change",
      },
      {
        id: QID.HBH3,
        t: "What might help you change your unhealthy browsing behavior",
      },
      {
        id: QID.HBH4,
        t: "What specific first step could you take right now to develop a better browsing behavior",
      },
      {
        id: QID.HBH5,
        t: "What would your ideal media consumption behavior look like",
      },
      {
        id: QID.HBH6,
        t: "Instead of visiting this website, what might be a better alternative",
        prompt: "Instead of using these websites I could",
        isSkipOnDashboard: true,
      },
      {
        id: QID.HBH7,
        t: "What is the purpose of visiting this website now",
        prompt: "In this session I want to",
        isDontSaveAnswer: true,
        isSkipOnDashboard: true,
      },
      {
        id: QID.HBH8,
        t: "What is a good reason why you want to visit this website less?",
        prompt: "I want to",
        isDontSaveAnswer: true,
        isSkipOnDashboard: true,
      },
    ],
  },
  [QuestionCategoryId.HealthierAppUsage]: {
    dashboardTxt: "Healthier App Usage",
    frequencyModifier: 2,
    limitTo: ["MobileApp"],
    questions: [
      {
        id: QID.HAU1,
        t: "What is the one thing you find most problematic in your recent usage of mobile apps",
        prompt: "The biggest challenge is",
      },
      {
        id: QID.HAU2,
        t: "What would you like to change in your phone usage",
        prompt: "I want to change",
      },
      {
        id: QID.HAU3,
        t: "What might help you change your unhealthy usage of mobile apps",
      },
      {
        id: QID.HAU4,
        t: "What specific first step could you take right now to develop better habits in using mobile apps",
      },
      {
        id: QID.HAU5,
        t: "What would your ideal media consumption behavior look like",
      },
      {
        id: QID.HAU6,
        t: "Instead of using this app, what might be a better alternative",
        prompt: "Instead of using these apps I could",
        isSkipOnDashboard: true,
      },
      {
        id: QID.HAU7,
        t: "What is the purpose of using this app now",
        prompt: "In this session I want to",
        isDontSaveAnswer: true,
        isSkipOnDashboard: true,
      },
      {
        id: QID.HAU8,
        t: "What is a good reason why you want to use this app less?",
        prompt: "I want to",
        isDontSaveAnswer: true,
        isSkipOnDashboard: true,
      },
    ],
  },
  [QuestionCategoryId.WhyReduceBrowsing]: {
    dashboardTxt: "Why I Want to Change",
    frequencyModifier: 1,
    limitTo: ["BrowserExtension"],
    questions: [
      {
        id: QID.WRB1,
        t: "Why do you want to spend less time on these websites?",
        prompt: "I want to spend less time online because",
      },
      {
        id: QID.WRB2,
        t: "What would you rather be doing instead of browsing?",
        prompt: "Instead, I'd rather",
      },
      {
        id: QID.WRB3,
        t: "What do you miss out on when you browse too much?",
        prompt: "I miss out on",
      },
      {
        id: QID.WRB4,
        t: "How would reducing your browsing time improve your life?",
        prompt: "My life would improve by",
      },
      {
        id: QID.WRB5,
        t: "What matters more to you than these websites?",
        prompt: "What matters more is",
      },
    ],
  },
  [QuestionCategoryId.WhyReduceAppUsage]: {
    dashboardTxt: "Why I Want to Change",
    frequencyModifier: 1,
    limitTo: ["MobileApp"],
    questions: [
      {
        id: QID.WRA1,
        t: "Why do you want to spend less time on these apps?",
        prompt: "I want to spend less time on apps because",
      },
      {
        id: QID.WRA2,
        t: "What would you rather be doing instead of using these apps?",
        prompt: "Instead, I'd rather",
      },
      {
        id: QID.WRA3,
        t: "What do you miss out on when you use these apps too much?",
        prompt: "I miss out on",
      },
      {
        id: QID.WRA4,
        t: "How would reducing your app usage improve your life?",
        prompt: "My life would improve by",
      },
      {
        id: QID.WRA5,
        t: "What matters more to you than these apps?",
        prompt: "What matters more is",
      },
    ],
  },
  [QuestionCategoryId.PersonalResources]: {
    dashboardTxt: "Personal Resources",
    questions: [
      {
        id: QID.PR1,
        t: "What is something you are good at",
        prompt: "I am good at",
      },
      {
        id: QID.PR2,
        t: "What is a strength of yours",
      },
    ],
  },
  [QuestionCategoryId.TodayILearned]: {
    isTodayOnlyCategory: true,
    isEveningCategory: true,
    dashboardTxt: "Today I learned",
    frequencyModifier: -1,
    questions: [
      { id: QID.TIL1, t: "Today I learned...", prompt: "I learned" },
      {
        id: QID.TIL2,
        t: "What did I learn about myself today",
        prompt: "I learned",
      },
    ],
  },
  [QuestionCategoryId.RefocusHelperToday]: {
    isTodayOnlyCategory: true,
    isMorningCategory: true,
    isWorkDayCategory: true,
    frequencyModifier: 1,
    dashboardTxt: "Finding Focus Today",
    questions: [
      {
        id: QID.RFHT1,
        t: "What is your most important task today",
        prompt: "My most important task is",
      },
      {
        id: QID.RFHT2,
        t: "What is most important today for you",
        prompt: "Most important is",
      },
      {
        id: QID.RFHT3,
        t: "What is the plan for today",
        prompt: "My plan for today is",
      },
      {
        id: QID.RFHT4,
        t: "If there was only one task I could do today, which one would it be",
        prompt: "Most important is",
      },
      {
        id: QID.RFHT5,
        t: "What would make you proud today, if it would finally be done",
        prompt: "I would be proud to",
      },
      {
        id: QID.RFHT6,
        t: "What small task can I do today, that will pave the way for other tasks",
      },
      {
        id: QID.RFHT7,
        t: "What do you want to achieve today",
        prompt: "Today I want to",
      },
      {
        id: QID.RFHT8,
        t: "What is the easiest and smallest task you could be working on now",
        prompt: "Right now, I can work on",
      },
      {
        id: QID.RFHT9,
        t: "What exactly needs to be done in your current task",
        prompt: "First I",
      },
      {
        id: QID.RFHT10,
        t: "What is one small step I can take towards my long-term goals today",
        prompt: "",
      },
      { id: QID.RFHT11, t: "What is currently my most important goal" },
      { id: QID.RFHT12, t: "What is the most fun task I could work on today" },
      {
        id: QID.RFHT13,
        t: "What is the most interesting thing I could work on today",
      },
    ],
  },
  [QuestionCategoryId.Motivation]: {
    dashboardTxt: "Motivation",
    frequencyModifier: -1,
    questions: [
      { id: QID.MO1, t: "What motivates you", prompt: "I am motivated by" },
      {
        id: QID.MO2,
        t: "What motivates you to make progress",
        prompt: "I am motivated by",
      },
    ],
  },
  [QuestionCategoryId.Gratitude]: {
    dashboardTxt: "Gratitude",
    frequencyModifier: 1,
    questions: [
      {
        id: QID.GR1,
        t: "What is something you are grateful for",
        prompt: "I am grateful for",
      },
    ],
  },
  [QuestionCategoryId.HelpfulTools]: {
    frequencyModifier: 1,
    dashboardTxt: "Helpful Tools",
    isMorningCategory: true,
    isWorkDayCategory: true,
    questions: [
      {
        id: QID.HT1,
        t: "What might help you concentrate",
        prompt: "I can concentrate better when",
      },
      {
        id: QID.HT2,
        t: "What might boost your productivity",
        prompt: "I am more productive when",
      },
      {
        id: QID.HT3,
        t: "What is a thing you might do instead of using this website",
        prompt: "Instead of visiting this website I",
      },
      {
        id: QID.HT4,
        t: "At what time of the day can you concentrate best",
        prompt: "I can concentrate best",
      },
      {
        id: QID.HT5,
        t: "What environment helps you work best? (consider light, noise, temperature, etc.)",
        prompt: "I need",
      },
      {
        id: QID.HT6,
        t: "How do I stay grounded when I feel overwhelmed",
        prompt: "I am able to stay grounded, when",
      },
      {
        id: QID.HT7,
        t: "How can you eliminate or reduce distractions",
      },
    ],
  },
  [QuestionCategoryId.CalmingThoughts]: {
    questions: [
      {
        id: QID.CT1,
        t: "What makes you feel relaxed",
        prompt: "I feel at ease when",
      },
      { id: QID.CT2, t: "Can you describe a calm place you might like" },
    ],
    dashboardTxt: "Calming Thoughts",
  },
  [QuestionCategoryId.PositiveThoughts]: {
    questions: [
      { id: QID.PT1, t: "What do you like", prompt: "I like" },
      { id: QID.PT2, t: "What do you love about life", prompt: "I love" },
      { id: QID.PT3, t: "What do you love about yourself", prompt: "I love" },
      { id: QID.PT4, t: "I am happy when...", prompt: "I am happy when" },
      {
        id: QID.PT5,
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
      { id: QID.GT1, t: "What is good today" },
      {
        id: QID.GT2,
        t: "What is a little thing you enjoyed today",
        prompt: "I enjoyed",
      },
      {
        id: QID.GT3,
        t: "What are you grateful for today",
        prompt: "I am grateful for",
      },
      {
        id: QID.GT4,
        t: "How did I show kindness to myself and others today",
      },
      {
        id: QID.GT5,
        t: "What positive experiences did I have today, no matter how small",
      },
      {
        id: QID.GT6,
        t: "In what ways did you improve today",
        prompt: "I improved by",
      },
      {
        id: QID.GT7,
        t: "What was the best thing about today",
        prompt: "The best thing today was",
      },
      {
        id: QID.GT8,
        t: "Who are you grateful for today",
        prompt: "I am grateful for",
      },
      {
        id: QID.GT9,
        t: "What are you most proud of doing today",
        prompt: "I am proud",
      },
    ],
    dashboardTxt: "Good Today",
  },
  [QuestionCategoryId.GoodPlans]: {
    questions: [
      { id: QID.GP1, t: "What is something you always wanted to do" },
      {
        id: QID.GP2,
        t: "What is a good habit you might want to establish",
        prompt: "I want to",
      },
      {
        id: QID.GP3,
        t: "What do you want to stop doing? And what can you do instead",
        prompt: "I want to stop",
      },
      {
        id: QID.GP4,
        t: "What is something new you could try",
        prompt: "I want to try",
      },
      {
        id: QID.GP5,
        t: "What do you want to change",
        prompt: "I want to change",
      },
      {
        id: QID.GP6,
        t: "What is something you'd like to learn",
        prompt: "I want to learn",
      },
    ],
    dashboardTxt: "Good Plans",
  },
  [QuestionCategoryId.GoodPlansToday]: {
    isTodayOnlyCategory: true,
    isMorningCategory: true,
    questions: [
      {
        id: QID.GPT1,
        t: "What is a nice thing you can do for yourself today",
      },
      {
        id: QID.GPT2,
        t: "What can you do so that today will be a good day",
        prompt: "I will",
      },
      {
        id: QID.GPT3,
        t: "Today I will do my best to...",
        prompt: "Today I will do my best to",
      },
      {
        id: QID.GPT4,
        t: "What is a little thing you can enjoy today",
        prompt: "Today I will enjoy",
      },
      {
        id: QID.GPT5,
        t: "What kind of person do you want to be today",
      },
      {
        id: QID.GPT6,
        t: "What is something you are looking forward to today",
      },
      {
        id: QID.GPT7,
        t: "What do you want to change today",
        prompt: "I want to change",
      },
    ],
    dashboardTxt: "Good Plans Today",
  },
  [QuestionCategoryId.GoalForTheWeek]: {
    isThisWeekOnlyCategory: true,
    isMorningCategory: true,
    isWorkDayCategory: true,
    questions: [
      { id: QID.GW1, t: "What is a goal you want to achieve this week" },
      {
        id: QID.GW2,
        t: "This week I will do my best to...",
        prompt: "This week I will do my best to",
      },
      { id: QID.GW3, t: "What is my most important goal this week" },
    ],
    dashboardTxt: "Your Goal for the Week",
  },
  [QuestionCategoryId.UnderstandingProcrastination]: {
    questions: [
      {
        id: QID.UP1,
        t: "What do you think is a factor that enables your procrastination",
      },
      {
        id: QID.UP2,
        t: "Why are you visiting this website",
        limitTo: ["BrowserExtension"],
      },
      { id: QID.UP3, t: "Where and how do I waste time" },
      { id: QID.UP4, t: "What is hurting your focus" },
      {
        id: QID.UP5,
        t: "In what situations do you have a hard time focusing and what contributes to it",
        prompt: "I find it hard to focus, when",
      },
      {
        id: QID.UP6,
        t: "In what situations do I reach a Flow state? And what contributes to it",
        prompt: "I reach the Flow state when",
      },
      {
        id: QID.UP7,
        t: "What emotions does this task bring up",
      },
    ],
    isMorningCategory: true,
    dashboardTxt: "Understanding Procrastination",
  },
  [QuestionCategoryId.Insomnia]: {
    questions: [
      { id: QID.IN1, t: "What are you feeling right now", prompt: "I feel" },
      {
        id: QID.IN2,
        t: "Is there something specific on your mind that you need to address or resolve before trying to sleep",
      },
      {
        id: QID.IN3,
        t: "Which unresolved tasks or worries can you address tomorrow, rather than ruminating on them tonight",
      },
      {
        id: QID.IN4,
        t: "What can you do to make yourself more comfortable in this moment",
      },
      {
        id: QID.IN5,
        t: "What other things could you do to wind down before sleep",
      },
    ],
    isLateNightCategory: true,
    isTodayOnlyCategory: true,
    dashboardTxt: "Insomnia",
  },
  [QuestionCategoryId.SelfDiscovery]: {
    frequencyModifier: 1,
    dashboardTxt: "Self Discovery",
    questions: [
      // { id: QID.SD1, t: "Are you using your time wisely" },
      { id: QID.SD2, t: "What do you want in life" },
      {
        id: QID.SD3,
        t: "You feel most energized when...",
        prompt: "I feel energized when",
      },
      {
        id: QID.SD4,
        t: "What are my core values, and how do they influence my decisions and actions",
      },
      {
        id: QID.SD5,
        t: "What skills do you want to learn in the next five years",
      },
      {
        id: QID.SD6,
        t: "What things that are out of your control stress you out? What might be a good way to deal with them",
      },
      { id: QID.SD7, t: "Is where you are today making you happy" },
      { id: QID.SD8, t: "Your favorite way to spend the day is..." },
      { id: QID.SD9, t: "The words you’d like to live by are..." },
      { id: QID.SD10, t: "If your body could talk, it would say..." },
      {
        id: QID.SD11,
        t: "What actions would make you proud of yourself",
        prompt: "I would be proud if",
      },
      { id: QID.SD12, t: "What is the biggest “What if” in your mind" },
      {
        id: QID.SD13,
        t: "If you could talk to your teenage self, the one thing you would say is...",
      },
      { id: QID.SD14, t: "Do you live a fulfilling life" },
      { id: QID.SD15, t: "What is your purpose" },
      { id: QID.SD16, t: "Why are you here" },
      {
        id: QID.SD17,
        t: "Can you take better care of your physical and mental well-being? How",
      },
      {
        id: QID.SD18,
        t: "What makes you happy",
      },
      {
        id: QID.SD19,
        t: "What is something you want",
        prompt: "I want",
      },
      {
        id: QID.SD20,
        t: "What am I really scared of",
        prompt: "I am scared of",
      },
      {
        id: QID.SD21,
        t: "What might I need to let go of",
        prompt: "I need to let go of",
      },
      {
        id: QID.SD22,
        t: "What are three words I would use to describe myself",
        prompt: "",
      },
      {
        id: QID.SD23,
        t: "If this were the last day of my life, what would be my plans for today",
        prompt: "",
      },
      {
        id: QID.SD24,
        t: "What activities make me lose track of time",
        prompt: "",
      },
      {
        id: QID.SD25,
        t: "Some quality I value in others is...",
      },
    ],
  },
  [QuestionCategoryId.XEnergyLevelToday]: {
    dashboardTxt: "Energy Level",
    isTodayOnlyCategory: true,
  },
  [QuestionCategoryId.XBrowsingBehaviorHappiness]: {
    dashboardTxt: "Browsing Behavior",
    isThisWeekOnlyCategory: true,
  },
  [QuestionCategoryId.XAppUsageHappiness]: {
    dashboardTxt: "Usage of configured Apps",
    isThisWeekOnlyCategory: true,
  },
  [QuestionCategoryId.XMoodCheckin]: {
    dashboardTxt: "Mood Checkin",
    isTodayOnlyCategory: true,
  },
  [QuestionCategoryId.XSelfAssessment]: {
    dashboardTxt: "Recently...",
  },
  [QuestionCategoryId.XEmotionLabeling]: {
    dashboardTxt: "Your Emotions Today",
    isTodayOnlyCategory: true,
  },
};

export const FIXED_QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.RefocusHelperToday,
  QuestionCategoryId.GoodToday,
  QuestionCategoryId.TodayILearned,
  QuestionCategoryId.GoalForTheWeek,
  QuestionCategoryId.HealthierAppUsage,
  QuestionCategoryId.HealthierBrowsingHabits,
  QuestionCategoryId.WhyReduceAppUsage,
  QuestionCategoryId.WhyReduceBrowsing,
];

export const RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.GoodPlans,
  QuestionCategoryId.Motivation,
  QuestionCategoryId.HelpfulTools,
  QuestionCategoryId.PersonalResources,
  QuestionCategoryId.Gratitude,
  QuestionCategoryId.UnderstandingProcrastination,
  QuestionCategoryId.SelfDiscovery,
  QuestionCategoryId.Insomnia,
  QuestionCategoryId.PositiveThoughts,
  QuestionCategoryId.CalmingThoughts,
];

const qids: Record<string, Question> = {};

export const QUESTIONS: QuestionForPrompt[] = [];
Object.values(QuestionCategoryId)
  // NOTE: we filter out all questions from categories starting with X
  .filter(filterSpecialWidgets)
  .forEach((categoryId) => {
    const entry = QUESTION_CATEGORIES[categoryId];
    entry.questions?.forEach((question: Question) => {
      if (qids[question.id]) {
        console.log(qids, question, qids[question.id]);
        throw new Error(`"${question.id}" was used for other question already`);
      }

      qids[question.id] = question;

      QUESTIONS.push({ ...question, categoryId });
    });
  });

// TODO update for IOS
export const isExcludedByLimitTo = (qc: QuestionCategory): boolean => {
  if (
    qc.limitTo &&
    ((!qc.limitTo.includes("MobileApp") && IS_APP) ||
      (!qc.limitTo.includes("BrowserExtension") && IS_WEB_EXT))
  ) {
    return true;
  }
  return false;
};

export const QUESTIONS_FOR_DEVICE: QuestionForPrompt[] = QUESTIONS.filter(
  (q) => {
    const categoryForQuestion = QUESTION_CATEGORIES[q.categoryId];
    return !isExcludedByLimitTo(categoryForQuestion);
  },
);
// console.log(JSON.stringify(QUESTIONS));

/*
IDEAS:
      {
       val: QID.PR1, t: "Why do you want to complete your current task",
        prompt: "Completing my current task, will allow me to",
      },


 */

/*
FOR LATER:
What kind of meal does make me feel good afterward?
What meal does make me happy?
What could I do to enjoy my meals more?
What would I like to change in my eating habits?


What kind of person do I want to be today?
What is one thing I can do tomorrow to be a better version of myself?
What situations make me feel terrible, and what do they have in common?
When am I at my best?
If I change nothing, what will your life look like three months from now? How does this make me feel?
What actions, if taken, would make me proud of myself, regardless of the outcome?
When negative thoughts arise, how do I deal with them?

What did I do today toward reaching my goals and what can i do tomorrow toward reaching my goals?

What do I want to achieve tomorrow?
What will get me out of bed on time tomorrow morning?


Recently I discovered that...

 */

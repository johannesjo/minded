import { QID } from "@src/shared/data/questionId";

export enum QuestionCategoryId {
  BetterBrowsingHabits = "BetterBrowsingHabits",
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
  XBrowsingBehaviorHappiness = "XBrowsingBehaviorHappiness",
  // NO save questions
  XXPurposeOfSession = "XXPurposeOfSession",
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
  id: QID;
  prompt?: string;
};

export type QuestionForPrompt = {
  categoryId: QuestionCategoryId;
  id: QID;
  t: string;
  prompt?: string;
};

export interface QuestionCategory {
  dashboardTxt: string;
  frequencyModifier?: number;
  isTodayOnlyCategory?: boolean;
  isThisWeekOnlyCategory?: boolean;
  isMorningCategory?: boolean;
  isEveningCategory?: boolean;
  isLateNightCategory?: boolean;
  isWorkDayCategory?: boolean;
  isDontSaveQuestion?: boolean;
  questions?: Question[];
  specialQuestions?: Question[];
}

export const QUESTION_CATEGORIES: {
  [key in QuestionCategoryId]: QuestionCategory;
} = {
  [QuestionCategoryId.BetterBrowsingHabits]: {
    dashboardTxt: "Better Browsing Habits",
    frequencyModifier: 2,
    questions: [
      {
        id: QID.BBH1,
        t: "What is the one thing you find most problematic in your recent browsing behavior",
        prompt: "The biggest challenge is",
      },
      {
        id: QID.BBH2,
        t: "What would you like to change in your browsing behavior",
        prompt: "I want to change",
      },
      {
        id: QID.BBH3,
        t: "What might help you change your negative browsing behavior",
      },
      {
        id: QID.BBH4,
        t: "What specific first step could you take right now to develop a better browsing behavior",
      },
      {
        id: QID.BBH5,
        t: "How would your ideal media consumption behavior look like?",
      },
      {
        id: QID.BBH6,
        t: "Instead of instant gratification, what might be a better alternative",
        prompt: "Instead of using these websites and apps I could",
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
    questions: [{ id: QID.TIL1, t: "Today I learned...", prompt: "I learned" }],
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
        t: "What would make me proud today, if it would finally be done",
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
        t: "What is the most easy and smallest task you could be working on now",
        prompt: "Right now, I can work on",
      },
      {
        id: QID.RFHT9,
        t: "What exactly needs to be done in your current task",
        prompt: "First I",
      },
      {
        id: QID.RFHT11,
        t: "Are you setting realistic goals and deadlines",
      },
      {
        id: QID.RFHT12,
        t: "How can you eliminate or reduce distractions",
      },
    ],
  },
  [QuestionCategoryId.Motivation]: {
    dashboardTxt: "Motivation",
    questions: [
      { id: QID.MO1, t: "What motivates you", prompt: "I am motivated by" },
      {
        id: QID.MO2,
        t: "What motivates me to make progress",
        prompt: "I am motivated by",
      },
    ],
  },
  [QuestionCategoryId.Gratitude]: {
    dashboardTxt: "Gratitude",
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
        t: "What do I need to work well in terms of light, order, temperature, social and physical environment",
        prompt: "I need",
      },
      {
        id: QID.HT6,
        t: "How do I stay grounded when I feel overwhelmed",
        prompt: "I am able to stay grounded, when",
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
        t: "What kind of person do I want to be today",
      },
      {
        id: QID.GPT6,
        t: "What is something you are looking forward to today",
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
    ],
    dashboardTxt: "Your Goal for the Week",
  },
  [QuestionCategoryId.UnderstandingProcrastination]: {
    questions: [
      {
        id: QID.UP1,
        t: "What do you think is a factor that enables your procrastination",
      },
      { id: QID.UP2, t: "Why are you visiting this website" },
      { id: QID.UP3, t: "Where and how do I waste time" },
      { id: QID.UP4, t: "What is hurting your focus" },
      {
        id: QID.UP5,
        t: "In what situations do you have a hard time focussing and what contributes to it",
        prompt: "I find it hard to focus, when",
      },
      {
        id: QID.UP6,
        t: "In what situations do I reach a Flow state? And what contributes to it",
        prompt: "I reach the Flow state when",
      },
      {
        id: QID.UP7,
        t: "What emotions are evoked by your current task",
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
        t: "Are there any unresolved tasks or worries that you can address tomorrow, rather than ruminating on them tonight",
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
    frequencyModifier: 2,
    dashboardTxt: "Self Discovery",
    questions: [
      { id: QID.SD1, t: "Are you using your time wisely" },
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
        t: "Are you letting matters that are out of your control stress you out",
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
        t: "Are you taking care of your physical and mental well-being",
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
    ],
  },
  [QuestionCategoryId.XXPurposeOfSession]: {
    dashboardTxt: "XXX",
    isTodayOnlyCategory: true,
    isDontSaveQuestion: true,
    questions: [
      {
        id: QID.XP1,
        t: "What is the purpose of visiting this website",
        prompt: "In this session I want to",
      },
    ],
  },
  [QuestionCategoryId.XEnergyLevelToday]: {
    dashboardTxt: "XXX",
    isTodayOnlyCategory: true,
  },
  [QuestionCategoryId.XBrowsingBehaviorHappiness]: {
    dashboardTxt: "XXX",
    isThisWeekOnlyCategory: true,
  },
};

export const FIXED_QUESTION_CATEGORIES_ON_DASHBOARD: QuestionCategoryId[] = [
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.RefocusHelperToday,
  QuestionCategoryId.GoodToday,
  QuestionCategoryId.TodayILearned,
  QuestionCategoryId.GoalForTheWeek,
  QuestionCategoryId.BetterBrowsingHabits,
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

const qids = {};

export const QUESTIONS: QuestionForPrompt[] = [];
Object.keys(QUESTION_CATEGORIES)
  // NOTE: we filter out all questions from categories starting with X
  .filter(filterSpecialWidgets)
  .forEach((categoryId) => {
    const entry = QUESTION_CATEGORIES[categoryId];
    entry.questions?.forEach((question) => {
      if (qids[question.id]) {
        console.log(qids, question, qids[question.id]);
        throw new Error(`"${question.id}" was used for other question already`);
      }

      qids[question.id] = question;

      QUESTIONS.push({ ...question, categoryId });
    });
  });

// console.log(JSON.stringify(QUESTIONS));

/*
IDEAS:
      {
       id: QID.PR1, t: "Why do you want to complete your current task",
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

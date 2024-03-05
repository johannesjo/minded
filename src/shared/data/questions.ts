export enum QuestionCategoryId {
  GoodToday = 'GoodToday',
  WhatYouWantToDo = 'WhatYouWantToDo',
  LikeAboutMyself = 'LikeAboutMyself',
  ThingsYouLike = 'ThingsYouLike',
  ThingsIAmGoodAt = 'ThingsIAmGoodAt',
  PersonalStrengths = 'PersonalStrengths',
  PlanForToday = 'PlanForToday',
  WhatMotivates = 'WhatMotivates',
  WhatHelpsCurrentSituation = 'WhatHelpsCurrentSituation',
  WhatHelpsConcentrate = 'WhatHelpsConcentrate',
  WhatIsAGoodDay = 'WhatIsAGoodDay',
  Other = 'Other',
}

export interface Question {
  category: QuestionCategoryId;
  txt: string;
  txtDashboard?: string;
}

export const QUESTIONS: Question[] = [
  {
    category: QuestionCategoryId.GoodToday,
    txt: 'What is good today'
  },
  {
    category: QuestionCategoryId.WhatYouWantToDo,
    txt: 'What do you want to do',
    txtDashboard: 'What you wanted to do'
  },
  {
    category: QuestionCategoryId.LikeAboutMyself,
    txt: 'What do you like about yourself',
    txtDashboard: 'I like about myself'
  },
  {
    category: QuestionCategoryId.ThingsIAmGoodAt,
    txt: 'What are you good at',
    txtDashboard: 'Things I am good at'
  },
  {
    category: QuestionCategoryId.PersonalStrengths,
    txt: 'What is a strength of yours',
    txtDashboard: 'A strength of mine is'
  },
  {
    category: QuestionCategoryId.ThingsYouLike,
    txt: 'What do you like',
    txtDashboard: 'Things you like'
  },
  {
    category: QuestionCategoryId.PlanForToday,
    txt: 'What is the plan for today',
  },
  {
    category: QuestionCategoryId.WhatMotivates,
    txt: 'What motivates you',
  },
  {
    category: QuestionCategoryId.WhatHelpsCurrentSituation,
    txt: 'What would help your current situation',
  },
  {
    category: QuestionCategoryId.WhatHelpsConcentrate,
    txt: 'What helps you concentrate',
  },
  {
    category: QuestionCategoryId.WhatIsAGoodDay,
    txt: 'What do you consider a good day',
  },
] as const;

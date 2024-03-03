export enum QuestionId {
  GoodToday = 'GoodToday',
}

export interface Question {
  id: QuestionId;
  txt: string;
  txtDashboard?: string;
}

export const QUESTIONS: Question[] = [
  {
    id: QuestionId.GoodToday,
    txt: 'What is good today'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What do you want to do',
    txtDashboard: 'What you wanted to do'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What do you like about yourself',
    txtDashboard: 'I like about myself'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What are you good at',
    txtDashboard: 'Things I am good at'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What is a strength of yours',
    txtDashboard: 'A strength of mine is'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What do you like',
    txtDashboard: 'Things you like'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What do you want to be',
    txtDashboard: 'I want to be'
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What is the plan for today',
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What motivates you',
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What would help your current situation',
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What helps you concentrate',
  },
  {
    id: QuestionId.GoodToday,
    txt: 'What do you consider a good day',
  },
] as const;

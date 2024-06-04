import { SyncData } from "@src/dataInterface/syncData";

export type DailyQuestionsMode = "DayStart" | "DayEnd";

export const DAILY_QUESTION_MORNING_START = 6;
export const DAILY_QUESTION_MORNING_END = 11;
export const DAILY_QUESTION_EVENING_START = 20;

export const getDailyQuestionsMode = (): DailyQuestionsMode => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= DAILY_QUESTION_EVENING_START) return "DayEnd";
  return "DayStart";
};

export const isShowDailyQuestionsBanner = (syncData: SyncData): boolean => {
  const now = new Date();
  const hour = now.getHours();

  return (
    (hour < DAILY_QUESTION_MORNING_END &&
      hour >= DAILY_QUESTION_MORNING_START) ||
    hour >= DAILY_QUESTION_EVENING_START
  );
};

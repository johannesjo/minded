import { SyncData } from "@src/dataInterface/syncData";
import { isToday } from "@src/util/isToday";

export type DailyQuestionsMode = "Morning" | "Evening";

export const DAILY_QUESTION_MORNING_START = 5;
export const DAILY_QUESTION_MORNING_END = 12;
export const DAILY_QUESTION_EVENING_START = 20;

export const getDailyQuestionsMode = (): DailyQuestionsMode => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= DAILY_QUESTION_EVENING_START) return "Evening";
  return "Morning";
};

export const isShowDailyQuestionsBanner = (syncData: SyncData): boolean => {
  const now = new Date();
  const hour = now.getHours();

  // console.log(
  //   syncData.dailyQuestionsMorningTS,
  //   syncData.dailyQuestionsEveningTS,
  //   isToday(syncData.dailyQuestionsMorningTS),

  //   getDailyQuestionsMode() === "Morning"
  //     ? !isToday(syncData.dailyQuestionsMorningTS) &&
  //         hour < DAILY_QUESTION_MORNING_END &&
  //         hour >= DAILY_QUESTION_MORNING_START
  //     : !isToday(syncData.dailyQuestionsEveningTS) &&
  //         hour >= DAILY_QUESTION_EVENING_START,
  // );

  return getDailyQuestionsMode() === "Morning"
    ? !isToday(syncData.dailyQuestionsMorningTS) &&
        hour < DAILY_QUESTION_MORNING_END &&
        hour >= DAILY_QUESTION_MORNING_START
    : !isToday(syncData.dailyQuestionsEveningTS) &&
        hour >= DAILY_QUESTION_EVENING_START;
};

import { Answer } from "@src/dataInterface/syncData";
import {
  filterSpecialWidgets,
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  QuestionForPrompt,
  QUESTIONS,
} from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { isThisWeek, isToday } from "@src/util/isToday";
import { isWorkDay } from "@src/util/isWorkDay";

const THRESHOLD_MORNING_START = 4;
const THRESHOLD_MORNING_END = 14;
const THRESHOLD_EVENING_START = 15;
const THRESHOLD_LATE_NIGHT_START = 0;
const THRESHOLD_LATE_NIGHT_END = 4;

const BOOST_FACTOR = 1;

const FAKE_RULE_OUT_NR = 9999;

export const getQuestionSmart = (answers: Answer[]): QuestionForPrompt => {
  const now = new Date();
  const isWorkDayToday = isWorkDay(now);
  const nowHours = now.getHours();

  if (!answers.length) {
    return getRndEntry(QUESTIONS);
  }

  const map: { [key in QuestionCategoryId]?: number } = {};

  Object.keys(QuestionCategoryId)
    .filter(filterSpecialWidgets)
    .forEach((categoryId: QuestionCategoryId) => {
      const categoryForAnswer = QUESTION_CATEGORIES[categoryId];
      if (categoryForAnswer?.questions?.length > 0) {
        map[categoryId] = 0;
      }
      if (categoryForAnswer?.frequencyModifier > 0) {
        map[categoryId] = -1 * categoryForAnswer.frequencyModifier;
      }

      if (categoryForAnswer.isMorningCategory) {
        if (
          nowHours < THRESHOLD_MORNING_START ||
          nowHours > THRESHOLD_MORNING_END
        ) {
          console.log(
            "getQuestionSmart(): SKIP MORNING",
            categoryForAnswer.dashboardTxt,
            categoryForAnswer,
          );
          map[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          console.log(
            // "getQuestionSmart(): BOOST  MORNING",
            categoryForAnswer.dashboardTxt,
            categoryForAnswer,
          );
          map[categoryId] = -1 * ((map[categoryId] || 0) + BOOST_FACTOR);
        }
      }
      if (categoryForAnswer.isEveningCategory) {
        if (nowHours < THRESHOLD_EVENING_START) {
          console.log(
            "getQuestionSmart(): SKIP EVENING",
            categoryForAnswer.dashboardTxt,
            categoryForAnswer,
          );
          map[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          console.log(
            // "getQuestionSmart(): BOOST  EVENING",
            categoryForAnswer.dashboardTxt,
            categoryForAnswer,
          );
          map[categoryId] = -1 * ((map[categoryId] || 0) + BOOST_FACTOR);
        }
      }
      if (categoryForAnswer.isLateNightCategory) {
        if (
          nowHours < THRESHOLD_LATE_NIGHT_START ||
          nowHours > THRESHOLD_LATE_NIGHT_END
        ) {
          console.log(
            "getQuestionSmart(): SKIP LATE_NIGHT",
            categoryForAnswer.dashboardTxt,
            categoryForAnswer,
          );
          map[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          console.log(
            // "getQuestionSmart(): BOOST  LATE_NIGHT",
            categoryForAnswer.dashboardTxt,
            categoryForAnswer,
          );
          map[categoryId] = -1 * ((map[categoryId] || 0) + BOOST_FACTOR);
        }
      }
      if (categoryForAnswer.isWorkDayCategory && !isWorkDayToday) {
        console.log(
          "getQuestionSmart(): SKIP IS_WORK_DAY_CATEGORY",
          categoryForAnswer.dashboardTxt,
          categoryForAnswer,
        );
        map[categoryId] = FAKE_RULE_OUT_NR;
      }
    });

  answers.forEach((answer) => {
    const categoryForAnswer = QUESTION_CATEGORIES[answer.questionCategoryId];
    if (!categoryForAnswer?.questions?.length) {
      return;
    }
    if (categoryForAnswer.isTodayOnlyCategory && !isToday(answer.ts)) {
      return;
    }
    if (categoryForAnswer.isThisWeekOnlyCategory && !isThisWeek(answer.ts)) {
      return;
    }

    map[answer.questionCategoryId] = map[answer.questionCategoryId] + 1;
  });

  // we
  const sortedEntries = Object.entries(map)
    .map(([catId, val]) => ({ catId, val }))
    .sort((a, b) => a.val - b.val);

  // effectively translates to random categories between all categories with 0 answer or less
  const nrOfEntriesForLeastUsed = Math.max(sortedEntries[0].val, 0);
  const categoriesLeastUsed = sortedEntries.filter(
    (se) => se.val <= nrOfEntriesForLeastUsed,
  );
  const categoryToUse = getRndEntry(categoriesLeastUsed).catId;
  const questionsForCategory = QUESTIONS.filter(
    (q) => q.categoryId === categoryToUse,
  );

  console.log("getQuestionSmart():", {
    map,
    sortedEntries,
    nrOfEntriesForLeastUsed,
    categoriesLeastUsed,
    categoryToUse,
    questionsForCategory,
    isWorkDayToday,
  });
  const q = getRndEntry(questionsForCategory);
  return q;
};

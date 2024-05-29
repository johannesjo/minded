import { Answer } from "@src/dataInterface/syncData";
import {
  filterSpecialWidgets,
  isExcludedByLimitTo,
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  QuestionForPrompt,
  QUESTIONS_FOR_DEVICE,
} from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { isThisWeek, isToday } from "@src/util/isToday";
import { isWorkDay } from "@src/util/isWorkDay";
import { isXIn1 } from "@src/util/isXIn1";

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
    return getRndEntry(QUESTIONS_FOR_DEVICE);
  }

  const map: { [key in QuestionCategoryId]?: number } = {};

  Object.keys(QuestionCategoryId)
    .filter(filterSpecialWidgets)
    .forEach((categoryId: QuestionCategoryId) => {
      const questionCategory = QUESTION_CATEGORIES[categoryId];

      if (questionCategory?.questions?.length > 0) {
        map[categoryId] = 0;
      }

      if (questionCategory?.frequencyModifier > 0) {
        map[categoryId] = questionCategory.frequencyModifier * -1;
      }

      if (questionCategory.isMorningCategory) {
        if (
          nowHours < THRESHOLD_MORNING_START ||
          nowHours > THRESHOLD_MORNING_END
        ) {
          map[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          map[categoryId] = (map[categoryId] || 0) + BOOST_FACTOR * -1;
        }
      }
      if (questionCategory.isEveningCategory) {
        if (nowHours < THRESHOLD_EVENING_START) {
          map[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          map[categoryId] = (map[categoryId] || 0) + BOOST_FACTOR * -1;
        }
      }
      if (questionCategory.isLateNightCategory) {
        if (
          nowHours < THRESHOLD_LATE_NIGHT_START ||
          nowHours > THRESHOLD_LATE_NIGHT_END
        ) {
          map[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          map[categoryId] = (map[categoryId] || 0) + BOOST_FACTOR * -1;
        }
      }
      if (questionCategory.isWorkDayCategory && !isWorkDayToday) {
        map[categoryId] = FAKE_RULE_OUT_NR;
      }
      if (isExcludedByLimitTo(questionCategory)) {
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

  const sortedEntries = Object.entries(map)
    .map(([catId, val]) => ({ catId, val }))
    .sort((a, b) => a.val - b.val);

  // effectively translates to random categories between all categories with 0 answer or less
  const scoreThreshold = Math.max(sortedEntries[0].val, 0);
  const categoriesLowestScore = sortedEntries.filter(
    (se) => se.val <= scoreThreshold,
  );

  // give an additional 1/3 chance to get the question with the actual lowest score
  const categoryToUse =
    categoriesLowestScore.length >= 2 &&
    categoriesLowestScore[0].val < categoriesLowestScore[1].val &&
    isXIn1(1 / 3)
      ? categoriesLowestScore[0].catId
      : getRndEntry(categoriesLowestScore).catId;

  const questionsForCategory = QUESTIONS_FOR_DEVICE.filter(
    (q) => q.categoryId === categoryToUse,
  );

  console.log("getQuestionSmart() map:", map);
  console.log("getQuestionSmart():", {
    sortedEntries,
    scoreThreshold,
    categoriesLowestScore,
    categoryToUse,
    questionsForCategory,
    isWorkDayToday,
  });
  console.log(categoriesLowestScore);

  return getRndEntry(questionsForCategory);
};

export const getQuestionSemiSmart = (now = new Date()): QuestionForPrompt => {
  const isWorkDayToday = isWorkDay(now);
  const nowHours = now.getHours();

  const questionsToUse = QUESTIONS_FOR_DEVICE.filter((q) => {
    const categoryForQuestion = QUESTION_CATEGORIES[q.categoryId];

    if (categoryForQuestion.isMorningCategory) {
      if (
        nowHours < THRESHOLD_MORNING_START ||
        nowHours > THRESHOLD_MORNING_END
      ) {
        return false;
      }
    }
    if (categoryForQuestion.isEveningCategory) {
      if (nowHours < THRESHOLD_EVENING_START) {
        return false;
      }
    }
    if (categoryForQuestion.isLateNightCategory) {
      if (
        nowHours < THRESHOLD_LATE_NIGHT_START ||
        nowHours > THRESHOLD_LATE_NIGHT_END
      ) {
        return false;
      }
    }
    if (categoryForQuestion.isWorkDayCategory && !isWorkDayToday) {
      return false;
    }
    return true;
  });
  return getRndEntry(questionsToUse);
};

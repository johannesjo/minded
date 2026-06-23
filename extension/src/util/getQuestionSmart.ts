import { Answer } from "@src/dataInterface/syncData";
import {
  filterSpecialWidgets,
  isExcludedByLimitTo,
  QUESTION_CATEGORIES,
  QuestionCategory,
  QuestionCategoryId,
  QuestionForPrompt,
  QUESTIONS_FOR_DEVICE,
} from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { isThisWeek, isToday } from "@src/util/isToday";
import { isWorkDay } from "@src/util/isWorkDay";
import { isXIn1 } from "@src/util/isXIn1";
import { isMain } from "@src/shared/isMain.const";

const THRESHOLD_MORNING_START = 4;
const THRESHOLD_MORNING_END = 14;
const THRESHOLD_EVENING_START = 15;
const THRESHOLD_LATE_NIGHT_START = 0;
const THRESHOLD_LATE_NIGHT_END = 4;

const BOOST_FACTOR = 1;

const FAKE_RULE_OUT_NR = 9999;

/**
 * Whether a category's questions are appropriate to surface *right now*, given
 * its time-of-day and work-day constraints (morning / evening / late-night /
 * work-day). This is the present-moment gate the question router uses so we
 * never ask, e.g. a "Finding Focus Today" question in the middle of the night.
 * Shared so other present-moment surfaces (like the dashboard greeting) honour
 * the exact same windows.
 */
export const isCategoryWithinTimeConstraints = (
  category: QuestionCategory | undefined,
  now = new Date(),
): boolean => {
  if (!category) {
    return true;
  }
  const nowHours = now.getHours();

  if (category.isMorningCategory) {
    if (
      nowHours < THRESHOLD_MORNING_START ||
      nowHours > THRESHOLD_MORNING_END
    ) {
      return false;
    }
  }
  if (category.isEveningCategory) {
    if (nowHours < THRESHOLD_EVENING_START) {
      return false;
    }
  }
  if (category.isLateNightCategory) {
    if (
      nowHours < THRESHOLD_LATE_NIGHT_START ||
      nowHours > THRESHOLD_LATE_NIGHT_END
    ) {
      return false;
    }
  }
  if (category.isWorkDayCategory && !isWorkDay(now)) {
    return false;
  }
  return true;
};

/*
What do I want to achieve?
* questions should be asked in a way that they are not too repetitive
* prioritized today question should have a much higher chance than others until they have at least X answers
* if they have X answers they should appear less
* categories with more questions should appear more often
 */

export const getQuestionSmart = (answers: Answer[]): QuestionForPrompt => {
  const now = new Date();
  const isWorkDayToday = isWorkDay(now);
  const nowHours = now.getHours();

  if (!answers.length) {
    return getRndQuestionConsideringMain(QUESTIONS_FOR_DEVICE);
  }

  const nrOfAnswersMap: { [key in QuestionCategoryId]?: number } = {};
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
    const currentCount = nrOfAnswersMap[answer.questionCategoryId];
    nrOfAnswersMap[answer.questionCategoryId] = currentCount
      ? currentCount + 1
      : 1;
  });

  // NOTE: lower score is better
  const pointsMap: { [key in QuestionCategoryId]?: number } = {};
  Object.values(QuestionCategoryId)
    .filter(filterSpecialWidgets)
    .forEach((categoryId) => {
      const questionCategory = QUESTION_CATEGORIES[categoryId];

      if (
        questionCategory?.questions &&
        questionCategory.questions.length > 0
      ) {
        pointsMap[categoryId] = 0;
      }

      if (typeof questionCategory?.frequencyModifier === "number") {
        pointsMap[categoryId] = questionCategory.frequencyModifier * -1;
      }

      if (questionCategory?.isMorningCategory) {
        if (
          nowHours < THRESHOLD_MORNING_START ||
          nowHours > THRESHOLD_MORNING_END
        ) {
          pointsMap[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          pointsMap[categoryId] =
            (pointsMap[categoryId] || 0) + BOOST_FACTOR * -1;
        }
      }
      if (questionCategory?.isEveningCategory) {
        if (nowHours < THRESHOLD_EVENING_START) {
          pointsMap[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          pointsMap[categoryId] =
            (pointsMap[categoryId] || 0) + BOOST_FACTOR * -1;
        }
      }
      if (questionCategory?.isLateNightCategory) {
        if (
          nowHours < THRESHOLD_LATE_NIGHT_START ||
          nowHours > THRESHOLD_LATE_NIGHT_END
        ) {
          pointsMap[categoryId] = FAKE_RULE_OUT_NR;
        } else {
          // boost when applicable
          pointsMap[categoryId] =
            (pointsMap[categoryId] || 0) + BOOST_FACTOR * -1;
        }
      }
      if (questionCategory?.isWorkDayCategory && !isWorkDayToday) {
        pointsMap[categoryId] = FAKE_RULE_OUT_NR;
      }
      if (isExcludedByLimitTo(questionCategory)) {
        pointsMap[categoryId] = FAKE_RULE_OUT_NR;
      }

      const nrOfAnswersForCategory = nrOfAnswersMap[categoryId] || 0;
      if (nrOfAnswersForCategory >= 3 && questionCategory?.questions?.length) {
        const currentPoints = pointsMap[categoryId] || 0;
        pointsMap[categoryId] =
          currentPoints +
          1 +
          Math.round(
            (nrOfAnswersForCategory / questionCategory.questions.length) * 10,
          );
      } else if (nrOfAnswersForCategory >= 1) {
        const currentPoints = pointsMap[categoryId] || 0;
        pointsMap[categoryId] = currentPoints + nrOfAnswersForCategory;
      }
    });

  const sortedEntries = Object.entries(pointsMap)
    .map(([catId, val]) => ({ catId, val }))
    .sort((a, b) => a.val - b.val);

  const scoreThreshold = sortedEntries[0].val;
  let categoriesLowestScore = sortedEntries.filter(
    (se) => se.val <= scoreThreshold,
  );

  // if there is only one category with the lowest score, then add a 40% chance for another category to be chosen
  if (categoriesLowestScore.length === 1 && sortedEntries.length > 1) {
    if (isXIn1(0.4)) {
      const candidates = sortedEntries
        .slice(1, 4)
        .filter((e) => e && e.val < FAKE_RULE_OUT_NR);
      if (candidates.length > 0) {
        categoriesLowestScore = [
          candidates[0],
          candidates[0],
          ...candidates.slice(1),
        ];
      }
    }
  }
  const categoryToUse = getRndEntry(categoriesLowestScore).catId;
  const questionsForCategory = QUESTIONS_FOR_DEVICE.filter(
    (q) => q.categoryId === categoryToUse,
  );

  // console.log("getQuestionSmart() pointsMap:", pointsMap);
  // console.log("getQuestionSmart():", {
  //   pointsMap,
  //   sortedEntries,
  //   scoreThreshold,
  //   categoriesLowestScore,
  //   categoryToUse,
  //   questionsForCategory,
  //   isWorkDayToday,
  // });

  if (questionsForCategory.length === 0) {
    return getRndQuestionConsideringMain(QUESTIONS_FOR_DEVICE);
  }
  return getRndQuestionConsideringMain(questionsForCategory);
};

export const getQuestionSemiSmart = (now = new Date()): QuestionForPrompt => {
  const questionsToUse = QUESTIONS_FOR_DEVICE.filter((q) =>
    isCategoryWithinTimeConstraints(QUESTION_CATEGORIES[q.categoryId], now),
  );
  return getRndQuestionConsideringMain(questionsToUse);
};

const getRndQuestionConsideringMain = (
  questions: QuestionForPrompt[],
): QuestionForPrompt => {
  if (isMain()) {
    const filtered = questions.filter((q) => !q.isSkipOnDashboard);
    if (filtered.length > 0) {
      return getRndEntry(filtered);
    }
  }
  return getRndEntry(questions);
};

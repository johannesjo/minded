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
import { isMain } from "@src/shared/isMain.const";

const THRESHOLD_MORNING_START = 4;
const THRESHOLD_MORNING_END = 14;
const THRESHOLD_EVENING_START = 15;
const THRESHOLD_LATE_NIGHT_START = 0;
const THRESHOLD_LATE_NIGHT_END = 4;

const BOOST_FACTOR = 1;

const FAKE_RULE_OUT_NR = 9999;

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
  if (categoriesLowestScore.length === 1) {
    if (isXIn1(0.4)) {
      categoriesLowestScore = [
        // next most likely entry has double the chance
        sortedEntries[1],
        sortedEntries[1],
        sortedEntries[2],
        sortedEntries[3],
      ];
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

  return getRndQuestionConsideringMain(questionsForCategory);
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
  return getRndQuestionConsideringMain(questionsToUse);
};

const getRndQuestionConsideringMain = (
  questions: QuestionForPrompt[],
): QuestionForPrompt => {
  if (isMain()) {
    return getRndEntry(questions.filter((q) => !q.isSkipOnDashboard));
  }
  return getRndEntry(questions);
};

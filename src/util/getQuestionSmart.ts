import { Answer } from "@src/shared/data/sync-data";
import {
  filterSpecialWidgets,
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  QuestionForPrompt,
  QUESTIONS,
} from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { isThisWeek, isToday } from "@src/util/isToday";

const THRESHOLD_MORNING_START = 4;
const THRESHOLD_MORNING_END = 14;
const THRESHOLD_EVENING_START = 15;
const FAKE_RULE_OUT_NR = 9999;

export const getQuestionSmart = (answers: Answer[]): QuestionForPrompt => {
  const now = new Date();
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

      if (categoryForAnswer.isMorningCategory) {
        if (
          nowHours < THRESHOLD_MORNING_START ||
          nowHours > THRESHOLD_MORNING_END
        ) {
          map[categoryId] = FAKE_RULE_OUT_NR;
        }
      }
      if (categoryForAnswer.isEveningCategory) {
        if (nowHours < THRESHOLD_EVENING_START) {
          map[categoryId] = FAKE_RULE_OUT_NR;
        }
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

  const sortedEntries = Object.entries(map).sort((a, b) => a[1] - b[1]);
  const nrOfEntriesForLeastUsed = sortedEntries[0][1];
  const categoriesLeastUsed = sortedEntries.filter(
    (se) => se[1] === nrOfEntriesForLeastUsed,
  );
  const categoryToUse = getRndEntry(categoriesLeastUsed)[0];
  const questionsForCategory = QUESTIONS.filter(
    (q) => q.categoryId === categoryToUse,
  );

  console.log({
    sortedEntries,
    nrOfEntriesForLeastUsed,
    categoriesLeastUsed,
    categoryToUse,
    questionsForCategory,
  });
  const q = getRndEntry(questionsForCategory);
  return q;
};

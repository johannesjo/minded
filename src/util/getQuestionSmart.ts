import { Answer } from "@src/shared/data/sync-data";
import {
  QUESTION_CATEGORIES,
  QuestionForPrompt,
  QUESTIONS,
} from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { isThisWeek, isToday } from "@src/util/isToday";

export const getQuestionSmart = (answers: Answer[]): QuestionForPrompt => {
  const now = new Date();
  if (!answers.length) {
    return getRndEntry(QUESTIONS);
  }

  const map: { [key: string]: number } = {};
  answers.forEach((answer) => {
    const categoryForAnswer = QUESTION_CATEGORIES[answer.questionCategoryId];
    if (!categoryForAnswer.questions?.length) {
      return;
    }
    if (categoryForAnswer.isTodayOnlyCategory && !isToday(answer.ts)) {
      return;
    }
    if (categoryForAnswer.isThisWeekOnlyCategory && !isThisWeek(answer.ts)) {
      return;
    }

    map[answer.questionCategoryId] = map[answer.questionCategoryId]
      ? map[answer.questionCategoryId] + 1
      : 1;
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

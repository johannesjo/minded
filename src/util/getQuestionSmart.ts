import { Answer } from '@src/shared/data/sync-data';
import { QuestionForPrompt, QUESTIONS } from '@src/shared/data/questions';
import { getRndEntry } from '@src/util/getRndEntry';

export const getQuestionSmart = (answers: Answer[]): QuestionForPrompt => {
  if(!answers.length) {
    return getRndEntry(QUESTIONS);
  }

  const map = {};
  answers.forEach(answer => {
    map[answer.questionCategoryId] = map[answer.questionCategoryId]
      ? map[answer.questionCategoryId] + 1
      : 1;
  });
  const sortedEntries = Object.entries(map).sort((a, b) => a[1] - b[1]);
  const nrOfEntriesForLeastUsed = sortedEntries[0][1];
  const categoriesLeastUsed = sortedEntries.filter(se => se[1] === nrOfEntriesForLeastUsed);
  const categoryToUse = getRndEntry(categoriesLeastUsed)[0];
  const questionsForCategory = QUESTIONS.filter(q => q.categoryId === categoryToUse);
  // console.log({sortedEntries, nrOfEntriesForLeastUsed, categoriesLeastUsed, categoryToUse, questionsForCategory});
  return getRndEntry(questionsForCategory);
};

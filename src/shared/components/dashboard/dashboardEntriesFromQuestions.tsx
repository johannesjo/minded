import { Answer } from '@src/shared/data/sync-data';
import { DashboardGroup, DashboardGroupType } from '@src/shared/components/dashboard/dashboard.model';
import { QUESTION_CATEGORIES, QUESTION_CATEGORIES_ON_DASHBOARD } from '@src/shared/data/questions';
import { getRndEntries } from '@src/util/getRndEntries';
import { isToday } from '@src/util/isToday';

const MAX_ANSWERS = 4;
const MAX_GROUPS = 9;
export const dashboardEntriesFromQuestions = (answers: Answer[], now = Date.now()): DashboardGroup[] => {
  const dashboardGroups = [];
  QUESTION_CATEGORIES_ON_DASHBOARD.forEach((catId) => {
    const category = QUESTION_CATEGORIES[catId];
    const answersForCat = answers.filter(
      (answer) => answer.questionCategoryId === catId && (!category.isTodayOnlyCategory || isToday(answer.ts)),
    );
    if(answersForCat?.length) {
      dashboardGroups.push({
        id: catId,
        dashboardTxt: QUESTION_CATEGORIES[catId].dashboardTxt,
        // TODO more sophisticated algorithm based on character length
        answers: getRndEntries(answersForCat, MAX_ANSWERS),
        type: DashboardGroupType.Standard,
      });
    }
  });
  console.log(dashboardGroups, getRndEntries(dashboardGroups, MAX_GROUPS));

  // const answerEntries = getRndEntries(dashboardGroups, MAX_GROUPS);
  const answerEntries = dashboardGroups.slice(-1 * MAX_GROUPS);

  answerEntries.splice(4, 0, {
    type: DashboardGroupType.Quote,
  });
  return answerEntries;
};

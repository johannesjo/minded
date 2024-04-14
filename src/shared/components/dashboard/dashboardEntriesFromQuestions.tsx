import { SyncData } from "@src/shared/data/syncData";
import {
  DashboardGroup,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import {
  QUESTION_CATEGORIES,
  QUESTION_CATEGORIES_ON_DASHBOARD,
} from "@src/shared/data/questions";
import { getRndEntries } from "@src/util/getRndEntries";
import { isThisWeek, isToday } from "@src/util/isToday";
import { getRndInt } from "@src/util/getRndInt";
import { replaceAt } from "@src/util/replaceAt";
import { getIsoDate } from "@src/util/getIsoDate";

const MAX_ANSWERS = 4;
const MAX_GROUPS = 9;
const CENTER_INDEX = 4;

export const dashboardEntriesFromQuestions = (
  syncData: SyncData,
  now = Date.now(),
): DashboardGroup[] => {
  const ds = getIsoDate();
  const dashboardGroups = [];
  QUESTION_CATEGORIES_ON_DASHBOARD.forEach((catId) => {
    const category = QUESTION_CATEGORIES[catId];
    const answersForCat = syncData.answers.filter(
      (answer) =>
        answer.questionCategoryId === catId &&
        (!category.isTodayOnlyCategory || isToday(answer.ts)) &&
        (!category.isThisWeekOnlyCategory || isThisWeek(answer.ts)),
    );
    if (answersForCat?.length) {
      dashboardGroups.push({
        id: catId,
        dashboardTxt: QUESTION_CATEGORIES[catId].dashboardTxt,
        // TODO more sophisticated algorithm based on character length
        answers: getRndEntries(answersForCat, MAX_ANSWERS),
        type: DashboardGroupType.Standard,
      });
    }
  });
  // console.log(dashboardGroups, getRndEntries(dashboardGroups, MAX_GROUPS));

  // const answerEntries = getRndEntries(dashboardGroups, MAX_GROUPS);
  let sortedEntries = dashboardGroups;

  if (sortedEntries.length >= 5) {
    const rndIndex = getRndInt(0, sortedEntries.length - 1);
    const rndEntry = { ...sortedEntries[rndIndex] };
    sortedEntries = replaceAt(sortedEntries, rndIndex, {
      type:
        syncData.blocked[ds] > 0
          ? DashboardGroupType.Stats
          : DashboardGroupType.Quote,
    });
    sortedEntries.splice(CENTER_INDEX, 0, rndEntry);
  } else {
    sortedEntries.splice(CENTER_INDEX, 0, {
      type: DashboardGroupType.Quote,
    });
  }

  // finally limit size
  sortedEntries = sortedEntries.slice(0, MAX_GROUPS);

  return sortedEntries;
};

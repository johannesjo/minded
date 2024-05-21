import { SyncData } from "@src/dataInterface/syncData";
import {
  DashboardGroup,
  DashboardGroupBrowsingBehavior,
  DashboardGroupEnergyLvl,
  DashboardGroupMood,
  DashboardGroupStats,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import {
  FIXED_QUESTION_CATEGORIES_ON_DASHBOARD,
  QUESTION_CATEGORIES,
  RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD,
} from "@src/shared/data/questions";
import { getRndEntries } from "@src/util/getRndEntries";
import { isThisWeek, isToday } from "@src/util/isToday";
import { getRndInt } from "@src/util/getRndInt";
import { getIsoDate } from "@src/util/getIsoDate";

const MAX_ANSWERS = 4;
const CENTER_INDEX = 4;

export const dashboardEntriesFromQuestions = (
  syncData: SyncData,
  now = new Date(),
): DashboardGroup[] => {
  const ds = getIsoDate(now);
  const dashboardGroups = [];
  const groupsToCheck = [
    ...FIXED_QUESTION_CATEGORIES_ON_DASHBOARD,
    ...getRndEntries(
      RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD,
      RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD.length,
    ),
  ];
  console.log(groupsToCheck);

  groupsToCheck.forEach((catId) => {
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
  // console.log(dashboardGroups);

  const sortedEntries: DashboardGroup[] = dashboardGroups;
  let fixedEntriesIndexAndNr = 0;

  if (syncData.sunTaps[ds] > 0) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      type: DashboardGroupType.Stats,
      attempts: syncData.attempts[ds] || 0,
      sunTaps: syncData.sunTaps[ds] || 0,
    } as DashboardGroupStats);
    fixedEntriesIndexAndNr++;
  }

  if (isToday(syncData.moodCheckTS)) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      type: DashboardGroupType.MoodCheckin,
      mood: syncData.moodCheckVal,
      additionalTxt: syncData.moodCheckAdditional,
    } as DashboardGroupMood);
    fixedEntriesIndexAndNr++;
  }

  if (isToday(syncData.energyLvlTS)) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      type: DashboardGroupType.EnergyLvl,
      energyLvl: syncData.energyLvlVal,
    } as DashboardGroupEnergyLvl);
    fixedEntriesIndexAndNr++;
  }

  if (Object.keys(syncData.browsingBehaviorRating).length >= 3) {
    sortedEntries.push({
      type: DashboardGroupType.BrowsingBehaviorRating,
      data: syncData.browsingBehaviorRating,
    } as DashboardGroupBrowsingBehavior);
    // sortedEntries.splice(ENERGY_LVL_INDEX, 0, {
    //   type: DashboardGroupType.BrowsingBehaviorRating,
    //   data: syncData.browsingBehaviorRating,
    // } as DashboardGroupBrowsingBehavior);
  }

  // center one rnd entry
  if (sortedEntries.length >= 5) {
    // NOTE: start val needs to be bigger than the fixed added entries
    const rndIndex = getRndInt(
      fixedEntriesIndexAndNr,
      sortedEntries.length - 1,
    );
    const rndEntry = { ...sortedEntries[rndIndex] };
    sortedEntries.splice(rndIndex, 1);
    sortedEntries.splice(CENTER_INDEX, 0, rndEntry);
  } else {
    sortedEntries.splice(CENTER_INDEX, 0, {
      type: DashboardGroupType.Quote,
    });
  }

  return sortedEntries;
};

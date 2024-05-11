import { SyncData } from "@src/shared/data/syncData";
import {
  DashboardGroup,
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

const STATS_INDEX = 0;
const MOOD_INDEX = 1;
const ENERGY_LVL_INDEX = 2;
const MAX_ANSWERS = 4;
const MAX_GROUPS = 9;
const CENTER_INDEX = 4;

export const dashboardEntriesFromQuestions = (
  syncData: SyncData,
  now = Date.now(),
): DashboardGroup[] => {
  const ds = getIsoDate();
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

  let sortedEntries: DashboardGroup[] = dashboardGroups;
  let fixedEntries = 0;

  if (syncData.blocked[ds] > 0) {
    fixedEntries++;
    sortedEntries.splice(STATS_INDEX, 0, {
      type: DashboardGroupType.Stats,
    } as DashboardGroupStats);
  }

  if (isToday(syncData.moodCheckTS)) {
    fixedEntries++;
    sortedEntries.splice(MOOD_INDEX, 0, {
      type: DashboardGroupType.MoodCheckin,
      mood: syncData.moodCheckVal,
      additionalTxt: syncData.moodCheckAdditional,
    } as DashboardGroupMood);
  }

  if (isToday(syncData.energyLvlTS)) {
    fixedEntries++;
    sortedEntries.splice(ENERGY_LVL_INDEX, 0, {
      type: DashboardGroupType.EnergyLvl,
      energyLvl: syncData.energyLvlVal,
    } as DashboardGroupEnergyLvl);
  }

  // center one rnd entry
  if (sortedEntries.length >= 5) {
    // NOTE: start val needs to be bigger than the fixed added entries
    const rndIndex = getRndInt(fixedEntries, sortedEntries.length - 1);
    const rndEntry = { ...sortedEntries[rndIndex] };
    sortedEntries.splice(rndIndex, 1);
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

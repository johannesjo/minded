import { Answer, SyncData } from "@src/dataInterface/syncData";
import {
  DashboardGroup,
  DashboardGroupAppUsageHappiness,
  DashboardGroupBrowsingBehaviorHappiness,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
  DashboardGroupMood,
  DashboardGroupSelAssessment,
  DashboardGroupStats,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import {
  FIXED_QUESTION_CATEGORIES_ON_DASHBOARD,
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD,
} from "@src/shared/data/questions";
import { getRndEntries } from "@src/util/getRndEntries";
import { isThisWeek, isToday } from "@src/util/isToday";
import { getRndInt } from "@src/util/getRndInt";
import { getIsoDate } from "@src/util/getIsoDate";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { getRecentSelfAssessmentEntries } from "@src/shared/components/dashboard/getRecentSelfAssementEntries";
import { resolveNightId } from "@src/shared/components/sleepWindDown/sleepWindDown.util";

const MAX_ANSWERS = 4;
const CENTER_INDEX = 4;
const MAX_SELF_ASSESSMENTS = 3;

export const getDashboardEntriesFromQuestions = (
  syncData: SyncData,
  now = new Date(),
  isSkipRndEntry = IS_ANDROID,
): DashboardGroup[] => {
  const ds = getIsoDate(now);
  const dashboardGroups: DashboardGroup[] = [];
  const groupsToCheck = [
    ...FIXED_QUESTION_CATEGORIES_ON_DASHBOARD,
    ...getRndEntries(
      RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD,
      RANDOM_QUESTION_CATEGORIES_ON_DASHBOARD.length,
    ),
  ];

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
        answers: getLastThreeAnswers(answersForCat),
        type: DashboardGroupType.TxtQuestion,
      });
    }
  });

  const sortedEntries: DashboardGroup[] = dashboardGroups;
  let fixedEntriesIndexAndNr = 0;

  // Wind-down is currently Android-only; show a tappable card while the user
  // is inside their configured wind-down window so they can re-enter the flow
  // even after snoozing or backing out to the dashboard.
  const swdCfg = syncData.cfg.sleepWindDown;
  if (IS_ANDROID && swdCfg?.enabled && resolveNightId(swdCfg, now) !== null) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      type: DashboardGroupType.SleepWindDown,
    });
    fixedEntriesIndexAndNr++;
  }

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
      id: QuestionCategoryId.XMoodCheckin,
      type: DashboardGroupType.MoodCheckin,
      mood: syncData.moodCheckVal,
      additionalTxt: syncData.moodCheckAdditional,
    } as DashboardGroupMood);
    fixedEntriesIndexAndNr++;
  }

  if (isToday(syncData.energyLvlTS)) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      id: QuestionCategoryId.XEnergyLevelToday,
      type: DashboardGroupType.EnergyLvl,
      energyLvl: syncData.energyLvlVal,
    } as DashboardGroupEnergyLvl);
    fixedEntriesIndexAndNr++;
  }

  if (isToday(syncData.emotionLabeling?.ts ?? 0) && syncData.emotionLabeling) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      id: QuestionCategoryId.XEmotionLabeling,
      type: DashboardGroupType.EmotionLabeling,
      emotions: syncData.emotionLabeling.emotions,
    } as DashboardGroupEmotionLabeling);
    fixedEntriesIndexAndNr++;
  }

  const entriesForSelfAssessment = getRecentSelfAssessmentEntries(
    syncData.selfAssessment,
    MAX_SELF_ASSESSMENTS,
  );
  if (entriesForSelfAssessment.length >= 1) {
    sortedEntries.splice(fixedEntriesIndexAndNr, 0, {
      id: QuestionCategoryId.XSelfAssessment,
      type: DashboardGroupType.SelfAssessment,
      entries: entriesForSelfAssessment,
    } as DashboardGroupSelAssessment);
    fixedEntriesIndexAndNr++;
  }

  if (Object.keys(syncData.browsingBehaviorRating).length >= 3 && !IS_ANDROID) {
    sortedEntries.push({
      id: QuestionCategoryId.XBrowsingBehaviorHappiness,
      type: DashboardGroupType.BrowsingBehaviorRating,
      data: syncData.browsingBehaviorRating,
    } as DashboardGroupBrowsingBehaviorHappiness);
  }

  if (Object.keys(syncData.appUsageRating).length >= 3 && IS_ANDROID) {
    sortedEntries.push({
      id: QuestionCategoryId.XAppUsageHappiness,
      type: DashboardGroupType.AppUsageRating,
      data: syncData.appUsageRating,
    } as DashboardGroupAppUsageHappiness);
  }

  // center one rnd entry
  if (sortedEntries.length >= 5) {
    if (!isSkipRndEntry) {
      // NOTE: start val needs to be bigger than the fixed added entries
      const rndIndex = getRndInt(
        fixedEntriesIndexAndNr,
        sortedEntries.length - 1,
      );
      const rndEntry = { ...sortedEntries[rndIndex] };
      sortedEntries.splice(rndIndex, 1);
      sortedEntries.splice(CENTER_INDEX, 0, rndEntry as DashboardGroup);
    }
  } else {
    sortedEntries.splice(CENTER_INDEX, 0, {
      type: DashboardGroupType.Quote,
    });
  }

  return sortedEntries;
};

const getLastThreeAnswers = (answers: Answer[]): Answer[] => {
  return answers.sort((a, b) => a.ts - b.ts).slice(-MAX_ANSWERS);
};

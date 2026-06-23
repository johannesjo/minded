import { Answer, SyncData } from "@src/dataInterface/syncData";
import {
  DashboardGroup,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
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
import { isCategoryWithinTimeConstraints } from "@src/util/getQuestionSmart";
import { isThisWeek, isToday } from "@src/util/isToday";
import { getRndInt } from "@src/util/getRndInt";
import { getIsoDate } from "@src/util/getIsoDate";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { getRecentSelfAssessmentEntries } from "@src/shared/components/dashboard/getRecentSelfAssementEntries";
import { resolveNightId } from "@src/shared/components/sleepWindDown/sleepWindDown.util";

const MAX_ANSWERS = 4;
// The slot the centre pick (or the fallback quote) is moved to — also the card
// the dashboard greets you with before you reveal the rest. Exported so the view
// can identify the greeting without re-deriving the placement logic.
export const CENTER_INDEX = 4;
const MAX_SELF_ASSESSMENTS = 3;

// The card types that may *greet* you on arrival (the centre pick). The greeting
// reflects — your own answers, mood, energy, emotions — or offers a calm quote;
// it never *measures*. The minded-decisions counter, the behaviour/app-usage
// charts and the wind-down CTA are deliberately excluded so the first card is
// never a tally, a trend, or a call to action. They still appear in the full
// grid once it's revealed. (The quote is handled separately as an always-present
// extra option, so it can greet on full days and is the natural empty fallback.)
const GREETING_ELIGIBLE_TYPES: ReadonlySet<DashboardGroupType> = new Set([
  DashboardGroupType.TxtQuestion,
  DashboardGroupType.EnergyLvl,
  DashboardGroupType.EmotionLabeling,
  DashboardGroupType.SelfAssessment,
]);

// Whether a card may *greet* you right now. The greeting is a present-moment
// surface, so a question recap must honour the same time-of-day / work-day
// window its live question would (e.g. never greet with "Finding Focus Today"
// in the middle of the night). The other greeting cards (energy, emotions,
// self-assessment) reflect today's own entries and have no such window.
// Out-of-window recaps still appear in the full "look back" grid — that view is
// explicitly historical, so they belong there, just not as the centre pick.
const isGreetingEligible = (entry: DashboardGroup, now: Date): boolean => {
  if (!GREETING_ELIGIBLE_TYPES.has(entry.type)) {
    return false;
  }
  if (entry.type === DashboardGroupType.TxtQuestion && "id" in entry) {
    return isCategoryWithinTimeConstraints(QUESTION_CATEGORIES[entry.id], now);
  }
  return true;
};

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

  // Move the greeting (the centre pick the dashboard opens on) to CENTER_INDEX.
  // The pick is drawn only from the reflective/self-report cards
  // (GREETING_ELIGIBLE_TYPES), plus the quote as one always-present extra
  // option — so a calm quote can greet you even on a full day, and is the
  // natural fallback when nothing reflective qualifies yet (an empty eligible
  // pool always lands on the quote). The random pick is web-only; Android keeps
  // its simpler fixed arrangement, with the quote fallback only when there's
  // little to show.
  if (!isSkipRndEntry) {
    const eligibleIndexes = sortedEntries.reduce<number[]>((acc, entry, i) => {
      if (isGreetingEligible(entry, now)) acc.push(i);
      return acc;
    }, []);

    const pick = getRndInt(0, eligibleIndexes.length);
    if (pick === eligibleIndexes.length) {
      sortedEntries.splice(CENTER_INDEX, 0, {
        type: DashboardGroupType.Quote,
      });
    } else {
      const [greeting] = sortedEntries.splice(eligibleIndexes[pick], 1);
      sortedEntries.splice(CENTER_INDEX, 0, greeting);
    }
  } else if (sortedEntries.length < 5) {
    sortedEntries.splice(CENTER_INDEX, 0, {
      type: DashboardGroupType.Quote,
    });
  }

  return sortedEntries;
};

const getLastThreeAnswers = (answers: Answer[]): Answer[] => {
  return answers.sort((a, b) => a.ts - b.ts).slice(-MAX_ANSWERS);
};

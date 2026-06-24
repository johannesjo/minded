import { Answer, SyncData } from "@src/dataInterface/syncData";
import {
  DashboardGroup,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
  DashboardGroupSelAssessment,
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

// A question recap whose category is outside its time-of-day / work-day window
// right now (e.g. a "Finding Focus Today" card — a morning, work-day category —
// shown in the evening or the middle of the night). Such a recap shouldn't be
// the card that *greets* you, but still belongs in the full "look back" grid,
// which is explicitly historical. The other reflective cards (energy, emotions,
// self-assessment) only ever reflect today's own entries, so they have no such
// window.
const isOutOfWindowRecap = (entry: DashboardGroup, now: Date): boolean =>
  entry.type === DashboardGroupType.TxtQuestion &&
  "id" in entry &&
  !isCategoryWithinTimeConstraints(QUESTION_CATEGORIES[entry.id], now);

// Whether a card may *greet* you right now: a reflective/self-report card that
// isn't an out-of-window recap.
export const isGreetingEligible = (entry: DashboardGroup, now: Date): boolean =>
  GREETING_ELIGIBLE_TYPES.has(entry.type) && !isOutOfWindowRecap(entry, now);

// Guard the card that actually greets you (the hero slot the view reads — see
// DashboardGroups.getHeroIndex). If it holds an out-of-window recap, move it out
// (it stays available in "look back") and greet with a calm quote instead —
// matching the fallback when nothing reflective qualifies. The random pick
// already keeps the hero in-window (isGreetingEligible), but the incremental
// merge (updateDashboardEntries) preserves the existing order, so a greeting
// that was in-window when first built can go stale as the hours pass — this is
// that path's safety net. Mutates and returns `entries`.
export const guardHeroSlot = (
  entries: DashboardGroup[],
  now = new Date(),
): DashboardGroup[] => {
  const heroIndex = Math.min(CENTER_INDEX, entries.length - 1);
  if (heroIndex >= 0 && isOutOfWindowRecap(entries[heroIndex], now)) {
    const [stale] = entries.splice(heroIndex, 1);
    entries.push(stale);
    entries.splice(CENTER_INDEX, 0, { type: DashboardGroupType.Quote });
  }
  return entries;
};

// A stable identity for a greeting candidate, used to remember which tile we
// last greeted with so the next arrival can surface a different one. The
// reflective cards carry a category id; the quote has only its type.
export const getGreetingKey = (dg: DashboardGroup): string =>
  "id" in dg ? dg.id : dg.type;

export const getDashboardEntriesFromQuestions = (
  syncData: SyncData,
  now = new Date(),
  // The greeting shown on the previous arrival, if any. We avoid repeating it so
  // each landing surfaces a fresh tile — but only when an alternative exists, so
  // we never end up with nothing to greet with.
  avoidGreetingKey?: string,
): DashboardGroup[] => {
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
  // pool always lands on the quote). Runs on every platform: each arrival
  // re-rolls the greeting (see avoidGreetingKey + the RE_GREET trigger) so the
  // dashboard never greets you with the same tile twice in a row. Out-of-window
  // question recaps are kept out of the pool (isGreetingEligible) so a morning
  // card never greets you at night — it stays in "look back" only.
  const eligibleIndexes = sortedEntries.reduce<number[]>((acc, entry, i) => {
    if (isGreetingEligible(entry, now)) acc.push(i);
    return acc;
  }, []);

  // The pool of greetings to draw from: every eligible reflective card, plus
  // the quote as one always-present extra option (the last slot).
  const options = [
    ...eligibleIndexes.map((index) => ({
      index,
      key: getGreetingKey(sortedEntries[index]),
    })),
    { index: -1, key: DashboardGroupType.Quote as string },
  ];

  // Prefer a tile different from the one shown last time we landed, so each
  // arrival feels fresh rather than possibly repeating. Only narrow the pool
  // when an alternative remains — never leave nothing to greet with.
  const pickable = options.filter((o) => o.key !== avoidGreetingKey);
  const pool = pickable.length > 0 ? pickable : options;

  const chosen = pool[getRndInt(0, pool.length - 1)];
  if (chosen.index === -1) {
    sortedEntries.splice(CENTER_INDEX, 0, {
      type: DashboardGroupType.Quote,
    });
  } else {
    const [greeting] = sortedEntries.splice(chosen.index, 1);
    sortedEntries.splice(CENTER_INDEX, 0, greeting);
  }

  // Make sure the card that greets you is never an out-of-window recap (the web
  // pick already keeps it in-window; this covers the Android positional build).
  return guardHeroSlot(sortedEntries, now);
};

const getLastThreeAnswers = (answers: Answer[]): Answer[] => {
  return answers.sort((a, b) => a.ts - b.ts).slice(-MAX_ANSWERS);
};

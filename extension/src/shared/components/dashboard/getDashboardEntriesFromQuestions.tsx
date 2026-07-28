import { Answer, SyncData } from "@src/dataInterface/syncData";
import {
  DashboardGroup,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
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

const MAX_ANSWERS = 4;
// The slot the centre pick (or the fallback quote) is moved to - also the card
// the dashboard greets you with before you reveal the rest. Exported so the view
// can identify the greeting without re-deriving the placement logic.
export const CENTER_INDEX = 4;

// The card types that may *greet* you on arrival (the centre pick). The greeting
// reflects - your own answers, mood, energy, emotions - or offers a calm quote;
// it never *measures*, and it is never a call to action (the wind-down CTA is
// excluded). No counter/chart card types exist anywhere on the dashboard - by
// design, not omission; don't add them. (The quote is handled separately as an
// always-present extra option, so it can greet on full days and is the natural
// empty fallback.)
const GREETING_ELIGIBLE_TYPES: ReadonlySet<DashboardGroupType> = new Set([
  DashboardGroupType.TxtQuestion,
  DashboardGroupType.EnergyLvl,
  DashboardGroupType.EmotionLabeling,
]);

// A question recap whose category is outside its time-of-day / work-day window
// right now (e.g. a "Finding Focus Today" card - a morning, work-day category -
// shown in the evening or the middle of the night). Such a recap shouldn't be
// the card that *greets* you, but still belongs in the full "look back" grid,
// which is explicitly historical. The other reflective cards (energy, emotions)
// only ever reflect today's own entries, so they have no such window.
const isOutOfWindowRecap = (entry: DashboardGroup, now: Date): boolean =>
  entry.type === DashboardGroupType.TxtQuestion &&
  "id" in entry &&
  !isCategoryWithinTimeConstraints(QUESTION_CATEGORIES[entry.id], now);

// Whether a card may *greet* you right now: a reflective/self-report card that
// isn't an out-of-window recap.
export const isGreetingEligible = (entry: DashboardGroup, now: Date): boolean =>
  GREETING_ELIGIBLE_TYPES.has(entry.type) && !isOutOfWindowRecap(entry, now);

// Guard the card that actually greets you (the hero slot the view reads - see
// DashboardGroups.heroOf). If it holds an out-of-window recap, move it out
// (it stays available in "look back") and greet with a calm quote instead -
// matching the fallback when nothing reflective qualifies. The random pick
// already keeps the hero in-window (isGreetingEligible), but the incremental
// merge (updateDashboardEntries) preserves the existing order, so a greeting
// that was in-window when first built can go stale as the hours pass - this is
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

// A stable identity for a greeting candidate, used to remember which tile is
// greeting the user - so a return can hold it and a re-greet can steer away
// from it. The reflective cards carry a category id; the quote has only its type.
export const getGreetingKey = (dg: DashboardGroup): string =>
  "id" in dg ? dg.id : dg.type;

/**
 * How this build should choose the greeting, given the tile the user currently
 * has (`getLastGreetingKey`). The two are exclusive, and between them they are
 * the whole rule that the greeting changes only offscreen:
 *
 * - `hold`: keep greeting with that tile. Landing on the dashboard again - back
 *   from a card's page, from settings, from anywhere - is a return, not a new
 *   arrival, so the greeting must be where the user left it.
 * - `avoid`: roll a new one, but not the same tile twice in a row. Only on a
 *   deliberate re-greet (RE_GREET_DASHBOARD_HIDDEN_EV), which always fires
 *   while the dashboard is out of sight.
 *
 * Holding steers the pick rather than overriding it afterwards, so a held
 * greeting is placed by the very same code that places a fresh one - no card
 * the pick chose is left stranded beside it, and the list is exactly what it
 * would be had the pick landed there by chance. It overrides the randomness,
 * though, never the rules: a held tile that has since gone (its last answer
 * deleted) or fallen out of its time window is simply not there to hold, and
 * the fresh pick stands.
 */
export type GreetingSteer =
  | { hold: string | undefined; avoid?: undefined }
  | { avoid: string | undefined; hold?: undefined };

export const getDashboardEntriesFromQuestions = (
  syncData: SyncData,
  now = new Date(),
  greetingSteer: GreetingSteer = { avoid: undefined },
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

  // Wind-down no longer has a dashboard card: it is a register of the normal
  // intervention flow (the wordless bedtime settle fires when the user reaches
  // for a blocked app inside their window), not a place to navigate into.
  // See docs/sleep-wind-down-redesign.md.

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

  // Move the greeting (the centre pick the dashboard opens on) to CENTER_INDEX.
  // The pick is drawn only from the reflective/self-report cards
  // (GREETING_ELIGIBLE_TYPES), plus the quote as one always-present extra
  // option - so a calm quote can greet you even on a full day, and is the
  // natural fallback when nothing reflective qualifies yet (an empty eligible
  // pool always lands on the quote). Runs on every platform. Which tile ends up
  // there is `greetingSteer`'s call - held from the last look, or freshly rolled
  // away from it - but the placement below is the same either way. Out-of-window
  // question recaps are kept out of the pool (isGreetingEligible) so a morning
  // card never greets you at night - it stays in "look back" only.
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

  // Hold the tile the user already has, when it's still one of the options -
  // gone or out of its window, it simply isn't there to hold and the pick below
  // stands. Otherwise draw a new one, steering away from the tile being
  // replaced so a re-greet doesn't land on it again - but only while an
  // alternative remains, so we never leave nothing to greet with.
  const held =
    greetingSteer.hold === undefined
      ? undefined
      : options.find((o) => o.key === greetingSteer.hold);
  const pickable = options.filter((o) => o.key !== greetingSteer.avoid);
  const pool = pickable.length > 0 ? pickable : options;

  const chosen = held ?? pool[getRndInt(0, pool.length - 1)];
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

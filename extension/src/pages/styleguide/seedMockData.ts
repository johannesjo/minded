import { saveSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import type { Answer, SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import { QuestionCategoryId } from "@src/shared/data/questions";

// A representative, deterministic dataset for the dashboard simulation: enough
// signal across the different card types (energy, stats, browsing
// behaviour, reflections) that the "show all" grid is populated
// and true to life - without depending on the questions catalogue beyond a
// couple of free-text answers.
const isoDaysAgo = (now: number, days: number): string =>
  getIsoDate(new Date(now - days * 24 * 60 * 60 * 1000));

const answer = (
  questionCategoryId: QuestionCategoryId,
  val: string,
  ts: number,
): Answer => ({
  id: `seed-${questionCategoryId}-${ts}`,
  qid: null,
  questionCategoryId,
  val,
  ts,
});

export const seedMockData = async (): Promise<void> => {
  const now = Date.now();
  const today = getIsoDate(new Date(now));

  const browsingBehaviorRating: Record<string, number> = {};
  [4, 3, 4, 2, 3, 4, 5].forEach((val, i) => {
    browsingBehaviorRating[isoDaysAgo(now, 6 - i)] = val;
  });

  const seeded: SyncData = {
    ...DEFAULT_SYNC_DATA,
    energyLvlTS: now,
    energyLvlVal: 4,
    browsingBehaviorRating,
    lastBrowsingBehaviorRatingTS: now,
    sunTaps: { [today]: 6 },
    sunTapTimestamps: [now - 1000 * 60 * 90, now - 1000 * 60 * 30, now],
    attempts: { [today]: 11 },
    answers: [
      answer(
        QuestionCategoryId.GoodToday,
        "Took a long walk without my phone.",
        now - 1000 * 60 * 60 * 3,
      ),
      answer(
        QuestionCategoryId.Gratitude,
        "Grateful for a slow morning coffee.",
        now - 1000 * 60 * 60 * 5,
      ),
      answer(
        QuestionCategoryId.GoodPlans,
        "Read a chapter before bed instead of scrolling.",
        now - 1000 * 60 * 60 * 26,
      ),
    ],
  };

  await saveSyncData(seeded);
};

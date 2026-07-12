import { Answer, SyncData } from "@src/dataInterface/syncData";
import { bro } from "@src/util/browser";
import { mergeSyncDataWithDefaults } from "@src/dataInterface/mergeSyncDataWithDefaults";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { DataStorageError, handleDataError } from "@src/dataInterface/errors";

const ITEMS_DO_DELETE_IF_OVER_QUOTE = 15;
const ITEM_CATEGORIES_TO_ALWAYS_DELETE: QuestionCategoryId[] = [
  QuestionCategoryId.GoodToday,
  QuestionCategoryId.TodayILearned,
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.RefocusHelperToday,
];

/** How many prune-and-retry rounds saveAnswerN attempts before giving up. */
const MAX_PRUNE_ROUNDS = 3;

/**
 * Storage rejections that pruning old answers can actually cure. Chrome's
 * quota errors carry these markers in the message: `QUOTA_BYTES` (which also
 * matches `QUOTA_BYTES_PER_ITEM`) and `MAX_ITEMS`. Rate-limit errors
 * (`MAX_WRITE_OPERATIONS_*`) and transient failures are NOT prune-recoverable —
 * deleting answers wouldn't help, so those must surface instead.
 */
const isPruneRecoverableError = (e: unknown): boolean => {
  const msg = String(e);
  return msg.includes("QUOTA_BYTES") || msg.includes("MAX_ITEMS");
};

export const getSyncDataN = (): Promise<SyncData> => {
  if (bro.runtime?.id) {
    return bro.storage.sync
      .get()
      .then((syncData) => mergeSyncDataWithDefaults(syncData));
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const saveSyncDataN = (syncData: SyncData): Promise<void> => {
  if (bro.runtime?.id) {
    return bro.storage.sync.set(syncData as unknown as Record<string, unknown>);
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const patchSyncDataN = (
  syncDataPatch: Partial<SyncData>,
): Promise<void> => {
  if (bro.runtime?.id) {
    return bro.storage.sync.set(
      syncDataPatch as unknown as Record<string, unknown>,
    );
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

// On the extension the usage observation is computed from stored `usageStats`
// (see getUsageObservation in commonSyncDataInterface), not via a native bridge.
export const getUsageObservationRawN = (): string | null => null;

/**
 * Save an answer, never silently losing it. The user's answers are the most
 * personal artifact the app holds (all data is local, there is no backup), so
 * every failure mode must either recover or surface:
 *
 * - Quota-flavored rejections (`QUOTA_BYTES*`, `MAX_ITEMS`) are cured by
 *   pruning the oldest answers (plus the recap-only categories) and retrying,
 *   up to MAX_PRUNE_ROUNDS. The just-given answer is never pruned.
 * - Anything else (rate limits, transient failures) — and a prune that still
 *   can't fit — alerts the user and rethrows, so callers know the answer did
 *   NOT save. Resolving successfully after a swallowed error is the one
 *   forbidden outcome.
 */
export const saveAnswerN = async (answer: Answer): Promise<void> => {
  const syncData = await getSyncDataN();
  let answers = [...syncData.answers, answer];

  for (let round = 0; ; round++) {
    try {
      await patchSyncDataN({ answers });
      return;
    } catch (e) {
      const pruned = pruneAnswersForQuota(answers, answer);
      const canRetry =
        round < MAX_PRUNE_ROUNDS &&
        isPruneRecoverableError(e) &&
        pruned.length < answers.length;
      if (!canRetry) {
        handleDataError(
          new DataStorageError(
            "Failed to save answer",
            "extension",
            "write",
            e,
          ),
          "Extension: saveAnswerN — the answer was NOT saved",
          { alertUser: true },
        );
        throw e;
      }
      console.warn("Over the storage quota — pruning oldest answers", {
        sizeBefore: JSON.stringify(answers).length,
        sizeAfter: JSON.stringify(pruned).length,
      });
      if (round === 0 && typeof window !== "undefined" && window.alert) {
        window.alert(
          "minded: saved answers exceed the browser's storage limit. Making room by removing the oldest ones — your new answer is kept.",
        );
      }
      answers = pruned;
    }
  }
};

/**
 * Drop the oldest answers (and the recap-only categories that are cheap to
 * lose) to get back under quota — keeping `keep` (the answer being saved)
 * no matter its age or category.
 */
const pruneAnswersForQuota = (answers: Answer[], keep: Answer): Answer[] =>
  [...answers]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, Math.max(1, answers.length - ITEMS_DO_DELETE_IF_OVER_QUOTE))
    .filter(
      (a) =>
        a.id === keep.id ||
        !ITEM_CATEGORIES_TO_ALWAYS_DELETE.includes(a.questionCategoryId),
    );

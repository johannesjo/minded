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
 * Storage rejections that pruning old answers can actually cure.
 * - Chromium reports its data quotas using either API-style names such as
 *   `QUOTA_BYTES_PER_ITEM` or C++-style names such as
 *   `Resource::kQuotaBytesPerItem`.
 * - Firefox throws one message for all three of its storage.sync quotas:
 *   "QuotaExceededError: storage.sync API call exceeded its quota
 *   limitations." (ExtensionStorageSync.sys.mjs) - matched by its distinctive
 *   phrase. A bare /quota/i match would be wrong: Chrome's rate-limit errors
 *   ("MAX_WRITE_OPERATIONS_* quota exceeded") contain "quota" too, and those
 *   are NOT prune-recoverable - deleting answers wouldn't help, so they must
 *   surface instead (as must transient failures).
 */
const isPruneRecoverableError = (e: unknown): boolean => {
  const msg = String(e).toLowerCase();
  return (
    msg.includes("quota_bytes") ||
    msg.includes("quotabytes") ||
    msg.includes("max_items") ||
    msg.includes("maxitems") ||
    msg.includes("exceeded its quota limitations")
  );
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
 * - Anything else (rate limits, transient failures) - and a prune that still
 *   can't fit - alerts the user and rethrows, so callers know the answer did
 *   NOT save. Resolving successfully after a swallowed error is the one
 *   forbidden outcome.
 */
export const saveAnswerN = async (answer: Answer): Promise<void> => {
  const syncData = await getSyncDataN();
  let answers = [...syncData.answers, answer];
  let didPrune = false;

  for (let round = 0; round <= MAX_PRUNE_ROUNDS; round++) {
    try {
      await patchSyncDataN({ answers });
      if (didPrune && typeof window !== "undefined" && window.alert) {
        // Only after the write actually succeeded - stating an outcome
        // before it happens would be a promise, not an observed fact.
        window.alert(
          "minded: your saved answers reached the browser's storage limit, so the oldest ones were removed to make room. Your new answer is saved.",
        );
      }
      return;
    } catch (e) {
      const pruned =
        round < MAX_PRUNE_ROUNDS && isPruneRecoverableError(e)
          ? pruneAnswersForQuota(answers, answer)
          : answers;
      if (pruned.length >= answers.length) {
        handleDataError(
          new DataStorageError(
            "Failed to save answer",
            "extension",
            "write",
            e,
          ),
          "Extension: saveAnswerN",
          {
            alertUser: true,
            userMessage:
              "minded couldn't save this answer - it was not stored. Your earlier answers are untouched. You may want to copy your text and try again.",
          },
        );
        throw e;
      }
      console.warn("Over the storage quota - pruning oldest answers", {
        answersBefore: answers.length,
        answersAfter: pruned.length,
      });
      answers = pruned;
      didPrune = true;
    }
  }
  // Unreachable: the loop always returns or throws (the last round's catch
  // takes the pruned === answers branch). Satisfies the return type.
  throw new Error("saveAnswerN: exhausted retries");
};

/**
 * Drop the oldest answers (and the recap-only categories that are cheap to
 * lose) to get back under quota - keeping `keep` (the answer being saved)
 * no matter its age or category. `keep` is set aside before the newest-N
 * slice so neither dropping mechanism can ever touch it (e.g. when a clock
 * correction left stored answers with newer timestamps than the one being
 * saved).
 */
const pruneAnswersForQuota = (answers: Answer[], keep: Answer): Answer[] => {
  const others = answers.filter((a) => a.id !== keep.id);
  const keptOthers = others
    .sort((a, b) => b.ts - a.ts)
    .slice(0, Math.max(0, others.length - ITEMS_DO_DELETE_IF_OVER_QUOTE))
    .filter(
      (a) => !ITEM_CATEGORIES_TO_ALWAYS_DELETE.includes(a.questionCategoryId),
    );
  return [...keptOthers, keep];
};

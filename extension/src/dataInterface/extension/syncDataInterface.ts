import { Answer, SyncData } from "@src/dataInterface/syncData";
import { bro } from "@src/util/browser";
import { mergeSyncDataWithDefaults } from "@src/dataInterface/mergeSyncDataWithDefaults";
import { QuestionCategoryId } from "@src/shared/data/questions";

const ITEMS_DO_DELETE_IF_OVER_QUOTE = 15;
const ITEM_CATEGORIES_TO_ALWAYS_DELETE: QuestionCategoryId[] = [
  QuestionCategoryId.GoodToday,
  QuestionCategoryId.TodayILearned,
  QuestionCategoryId.GoodPlansToday,
  QuestionCategoryId.RefocusHelperToday,
];

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
    return bro.storage.sync.set(syncData);
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
    return bro.storage.sync.set(syncDataPatch);
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const saveAnswerN = (answer: Answer): Promise<void> => {
  return getSyncDataN().then((syncData) => {
    const newAnswers = [...syncData.answers, answer];
    return patchSyncDataN({
      answers: newAnswers,
    }).catch((e) => {
      console.error(e);
      if (e.toString().indexOf("QUOTA_BYTES_PER_ITEM") > 0) {
        const newAnswersSliced = newAnswers
          .sort((a, b) => b.ts - a.ts)
          .slice(0, newAnswers.length - ITEMS_DO_DELETE_IF_OVER_QUOTE)
          .filter(
            (answer) =>
              !ITEM_CATEGORIES_TO_ALWAYS_DELETE.includes(
                answer.questionCategoryId,
              ),
          );
        console.warn("We are over the quota, since we delete old answers", {
          newAnswers,
          newAnswersSliced,
          sizeBefore: JSON.stringify(newAnswers).length,
          sizeAfter: JSON.stringify(newAnswersSliced).length,
        });
        if (window?.alert) {
          window.alert(
            "Minded Browser Extension: We are over the quota of allowed saved data in chrome extensions. But no problem! We will delete old answers to make room for new ones.",
          );
        }
        return patchSyncDataN({
          answers: newAnswersSliced,
        });
      }
    });
  });
};

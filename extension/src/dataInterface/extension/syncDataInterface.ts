import { Answer, SyncData, UserCfg } from "@src/dataInterface/syncData";
import { bro } from "@src/util/browser";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { getIsoDate } from "@src/util/getIsoDate";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

const ITEMS_DO_DELETE_IF_OVER_QUOTE = 15;
const ITEM_CATEGORIES_TO_ALWAYS_DELETE: QuestionCategoryId[] = [
  QuestionCategoryId.XXPurposeOfSession,
  QuestionCategoryId.XEnergyLevelToday,
];

export const getSyncDataN = (): Promise<SyncData> => {
  if (bro.runtime?.id) {
    return bro.storage.sync.get().then((syncData) => ({
      ...DEFAULT_SYNC_DATA,
      ...syncData,
    }));
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

export const saveAnswerN = (answer: Answer): Promise<void> => {
  return getSyncDataN()
    .then((syncData) => {
      const newAnswers = [...syncData.answers, answer];
      return saveSyncDataN({
        ...syncData,
        // answers: newAnswers.slice(0, ITEMS_DO_DELETE_IF_OVER_QUOTE),
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
          return saveSyncDataN({
            ...syncData,
            answers: newAnswersSliced,
          });
        }
      });
    })
    .then(() => {
      getSyncDataN().then(console.log);
    });
};
//
// export const saveMoodCheckIn = (
//   mood: MoodCheckinVal,
//   additional?: string,
// ): Promise<void> => {
//   return getSyncData().then((syncData) => {
//     return saveSyncData({
//       ...syncData,
//       moodCheckTS: Date.now(),
//       moodCheckVal: mood,
//       moodCheckAdditional: additional,
//     });
//   });
// };
//
// export const saveEnergyLvl = (energyLvlVal: number): Promise<void> => {
//   return getSyncData().then((syncData) => {
//     return saveSyncData({
//       ...syncData,
//       energyLvlTS: Date.now(),
//       energyLvlVal,
//     });
//   });
// };
//
// export const updateAnswer = (answerToUpdate: Answer): Promise<void> => {
//   return getSyncData()
//     .then((syncData) =>
//       saveSyncData({
//         ...syncData,
//         answers: syncData.answers.map((aI) =>
//           aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
//         ),
//       }),
//     )
//     .then(() => {
//       getSyncData().then(console.log);
//     });
// };
//
// export const removeAnswer = (answerId: string): Promise<void> => {
//   return getSyncData()
//     .then((syncData) =>
//       saveSyncData({
//         ...syncData,
//         answers: syncData.answers.filter((aI) => aI.id !== answerId),
//       }),
//     )
//     .then(() => {
//       getSyncData().then(console.log);
//     });
// };
//
// export const updateUserCfg = async (cfg: Partial<UserCfg>): Promise<void> => {
//   const syncData = await getSyncData();
//   const newSyncData: SyncData = {
//     ...syncData,
//     cfg: {
//       ...syncData.cfg,
//       ...cfg,
//     },
//   };
//   return saveSyncData(newSyncData);
// };
//
// //
//
// export const countOpeningAttempt = async (): Promise<void> => {
//   const ds = getIsoDate();
//   const syncData = await getSyncData();
//   const newSyncData: SyncData = {
//     ...syncData,
//     attempts: {
//       ...syncData.attempts,
//       [ds]: syncData.attempts[ds] ? syncData.attempts[ds] + 1 : 1,
//     },
//   };
//   return saveSyncData(newSyncData);
// };
//
// export const countSunTap = async (): Promise<void> => {
//   const ds = getIsoDate();
//   const syncData = await getSyncData();
//   const newSyncData: SyncData = {
//     ...syncData,
//     sunTaps: {
//       ...syncData.sunTaps,
//       [ds]: syncData.sunTaps[ds] ? syncData.sunTaps[ds] + 1 : 1,
//     },
//   };
//   return saveSyncData(newSyncData);
// };
//
// export const rateCurrentBrowsingBehavior = async (
//   val: number,
//   dateTS = Date.now(),
// ): Promise<void> => {
//   const ds = getIsoDate(new Date(dateTS));
//   const syncData = await getSyncData();
//   const newSyncData: SyncData = {
//     ...syncData,
//     lastBrowsingBehaviorRatingTS: dateTS,
//     browsingBehaviorRating: {
//       ...syncData.browsingBehaviorRating,
//       [ds]: val,
//     },
//   };
//   return saveSyncData(newSyncData);
// };

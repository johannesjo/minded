import { Answer, SyncData, UserCfg } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

const ITEMS_DO_DELETE_IF_OVER_QUOTE = 15;
const ITEM_CATEGORIES_TO_ALWAYS_DELETE: QuestionCategoryId[] = [
  QuestionCategoryId.XXPurposeOfSession,
  QuestionCategoryId.XEnergyLevelToday,
];

export const saveAnswer = (answer: Answer): Promise<void> => {
  return "XXX " as any;

  // return getSyncData()
  //   .then((syncData) => {
  //     const newAnswers = [...syncData.answers, answer];
  //     return saveSyncData({
  //       ...syncData,
  //       // answers: newAnswers.slice(0, ITEMS_DO_DELETE_IF_OVER_QUOTE),
  //       answers: newAnswers,
  //     }).catch((e) => {
  //       console.error(e);
  //       if (e.toString().indexOf("QUOTA_BYTES_PER_ITEM") > 0) {
  //         const newAnswersSliced = newAnswers
  //           .sort((a, b) => b.ts - a.ts)
  //           .slice(0, newAnswers.length - ITEMS_DO_DELETE_IF_OVER_QUOTE)
  //           .filter(
  //             (answer) =>
  //               !ITEM_CATEGORIES_TO_ALWAYS_DELETE.includes(
  //                 answer.questionCategoryId,
  //               ),
  //           );
  //         console.warn("We are over the quota, since we delete old answers", {
  //           newAnswers,
  //           newAnswersSliced,
  //           sizeBefore: JSON.stringify(newAnswers).length,
  //           sizeAfter: JSON.stringify(newAnswersSliced).length,
  //         });
  //         if (window.alert) {
  //           window.alert(
  //             "Minded Browser Extension: We are over the quota of allowed saved data in chrome extensions. But no problem! We will delete old answers to make room for new ones.",
  //           );
  //         }
  //         return saveSyncData({
  //           ...syncData,
  //           answers: newAnswersSliced,
  //         });
  //       }
  //     });
  //   })
  //   .then(() => {
  //     getSyncData().then(console.log);
  //   });
};

export const saveMoodCheckIn = (
  mood: MoodCheckinVal,
  additional?: string,
): Promise<void> => {
  return "XXX " as any;

  // return getSyncData().then((syncData) => {
  //   return saveSyncData({
  //     ...syncData,
  //     moodCheckTS: Date.now(),
  //     moodCheckVal: mood,
  //     moodCheckAdditional: additional,
  //   });
  // });
};

export const saveEnergyLvl = (energyLvlVal: number): Promise<void> => {
  return "XXX " as any;

  // return getSyncData().then((syncData) => {
  //   return saveSyncData({
  //     ...syncData,
  //     energyLvlTS: Date.now(),
  //     energyLvlVal,
  //   });
  // });
};

export const updateAnswer = (answerToUpdate: Answer): Promise<void> => {
  return "XXX " as any;

  // return getSyncData()
  //   .then((syncData) =>
  //     saveSyncData({
  //       ...syncData,
  //       answers: syncData.answers.map((aI) =>
  //         aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
  //       ),
  //     }),
  //   )
  //   .then(() => {
  //     getSyncData().then(console.log);
  //   });
};

export const removeAnswer = (answerId: string): Promise<void> => {
  return "XXX " as any;

  // return getSyncData()
  //   .then((syncData) =>
  //     saveSyncData({
  //       ...syncData,
  //       answers: syncData.answers.filter((aI) => aI.id !== answerId),
  //     }),
  //   )
  //   .then(() => {
  //     getSyncData().then(console.log);
  //   });
};

export const saveSyncData = (syncData: SyncData): Promise<void> => {
  return "XXX " as any;

  // if (bro.runtime?.id) {
  //   return bro.storage.sync.set(syncData);
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const updateSyncData = async (
  newSyncData: Partial<SyncData>,
): Promise<void> => {
  return "XXX " as any;

  // if (bro.runtime?.id) {
  //   const syncData = await getSyncData();
  //   return bro.storage.sync.set({
  //     ...syncData,
  //     ...newSyncData,
  //   });
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const updateCfg = async (cfg: Partial<UserCfg>): Promise<void> => {
  return "XXX " as any;

  // if (bro.runtime?.id) {
  //   const syncData = await getSyncData();
  //   return bro.storage.sync.set({
  //     ...syncData,
  //     cfg: {
  //       ...syncData.cfg,
  //       ...cfg,
  //     },
  //   });
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

//
export const getSyncData = async (): Promise<SyncData> => {
  return DEFAULT_SYNC_DATA;

  // if (bro.runtime?.id) {
  //   return bro.storage.sync.get().then((syncData) => ({
  //     ...DEFAULT_SYNC_DATA,
  //     ...syncData,
  //   }));
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const countOpeningAttempt = async (): Promise<void> => {
  return "XXX " as any;

  // const ds = getIsoDate();
  // if (bro.runtime?.id) {
  //   const syncData = await getSyncData();
  //   return bro.storage.sync.set({
  //     ...syncData,
  //     attempts: {
  //       ...syncData.attempts,
  //       [ds]: syncData.attempts[ds] ? syncData.attempts[ds] + 1 : 1,
  //     },
  //   });
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const countBlockedAttempt = async (): Promise<void> => {
  return "XXX " as any;

  // const ds = getIsoDate();
  // if (bro.runtime?.id) {
  //   const syncData = await getSyncData();
  //   return bro.storage.sync.set({
  //     ...syncData,
  //     blocked: {
  //       ...syncData.blocked,
  //       [ds]: syncData.blocked[ds] ? syncData.blocked[ds] + 1 : 1,
  //     },
  //   });
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

export const rateCurrentBrowsingBehavior = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  return "XXX " as any;

  // const ds = getIsoDate(new Date(dateTS));
  // if (bro.runtime?.id) {
  //   const syncData = await getSyncData();
  //   return bro.storage.sync.set({
  //     ...syncData,
  //     lastBrowsingBehaviorRatingTS: dateTS,
  //     browsingBehaviorRating: {
  //       ...syncData.browsingBehaviorRating,
  //       [ds]: val,
  //     },
  //   });
  // } else {
  //   throw new Error(
  //     "Extension was reloaded, please reload tab for it to work here again",
  //   );
  // }
};

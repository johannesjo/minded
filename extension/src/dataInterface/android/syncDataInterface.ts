import { Answer, SyncData, UserCfg } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { getIsoDate } from "@src/util/getIsoDate";

export const saveAnswer = (answer: Answer): Promise<void> => {
  return getSyncData().then((syncData) => {
    const newAnswers = [...syncData.answers, answer];
    return saveSyncData({
      ...syncData,
      answers: newAnswers,
    }).then(() => {
      getSyncData().then(console.log);
    });
  });
};

export const saveMoodCheckIn = (
  mood: MoodCheckinVal,
  additional?: string,
): Promise<void> => {
  return getSyncData().then((syncData) => {
    return saveSyncData({
      ...syncData,
      moodCheckTS: Date.now(),
      moodCheckVal: mood,
      moodCheckAdditional: additional,
    });
  });
};

export const saveEnergyLvl = (energyLvlVal: number): Promise<void> => {
  return getSyncData().then((syncData) => {
    return saveSyncData({
      ...syncData,
      energyLvlTS: Date.now(),
      energyLvlVal,
    });
  });
};

export const updateAnswer = (answerToUpdate: Answer): Promise<void> => {
  return getSyncData()
    .then((syncData) =>
      saveSyncData({
        ...syncData,
        answers: syncData.answers.map((aI) =>
          aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
        ),
      }),
    )
    .then(() => {
      getSyncData().then(console.log);
    });
};

export const removeAnswer = (answerId: string): Promise<void> => {
  return getSyncData()
    .then((syncData) =>
      saveSyncData({
        ...syncData,
        answers: syncData.answers.filter((aI) => aI.id !== answerId),
      }),
    )
    .then(() => {
      getSyncData().then(console.log);
    });
};

export const saveSyncData = async (syncData: SyncData): Promise<void> => {
  androidInterface.saveDataString(JSON.stringify(syncData));
};

export const updateSyncData = async (
  newSyncData: Partial<SyncData>,
): Promise<void> => {
  const syncData = await getSyncData();
  return androidInterface.saveDataString(
    JSON.stringify({
      ...syncData,
      ...newSyncData,
    }),
  );
};

export const updateBlockedApps = async (
  blockedApps: string[],
): Promise<void> => {
  return updateUserCfg({
    blockedApps,
  });
};

export const updateUserCfg = async (cfg: Partial<UserCfg>): Promise<void> => {
  const syncData = await getSyncData();
  return androidInterface.saveDataString(
    JSON.stringify({
      ...syncData,
      cfg: {
        ...syncData.cfg,
        ...cfg,
      },
    }),
  );
};

//
export const getSyncData = async (): Promise<SyncData> => {
  const str = androidInterface.retrieveDataString();
  try {
    return {
      ...DEFAULT_SYNC_DATA,
      ...JSON.parse(str),
    };
  } catch (e) {
    console.error(e);
    return DEFAULT_SYNC_DATA;
  }
};

export const countOpeningAttempt = async (): Promise<void> => {
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
  const ds = getIsoDate();
  const syncData = await getSyncData();
  return updateSyncData({
    ...syncData,
    sunTaps: {
      ...syncData.sunTaps,
      [ds]: syncData.sunTaps[ds] ? syncData.sunTaps[ds] + 1 : 1,
    },
  });
};

export const rateCurrentBrowsingBehavior = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  const ds = getIsoDate(new Date(dateTS));
  const syncData = await getSyncData();
  return updateSyncData({
    ...syncData,
    lastBrowsingBehaviorRatingTS: dateTS,
    browsingBehaviorRating: {
      ...syncData.browsingBehaviorRating,
      [ds]: val,
    },
  });
};

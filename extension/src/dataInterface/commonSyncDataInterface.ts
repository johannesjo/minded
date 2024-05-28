import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { Answer, SyncData, UserCfg } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
// @ts-ignore
import {
  getSyncDataN,
  saveAnswerN,
  saveSyncDataN,
  // @ts-ignore
} from "@dataInterface/syncDataInterface";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentRating/selfAssessment.model";

export const getSyncData: () => Promise<SyncData> = getSyncDataN;
export const saveSyncData: (syncData: SyncData) => Promise<void> =
  saveSyncDataN;
export const saveAnswer: (answer: Answer) => Promise<void> = saveAnswerN;

export const updateSyncData = async (
  newSyncData: Partial<SyncData>,
): Promise<void> => {
  const syncData = await getSyncData();
  const updatedSyncData: SyncData = {
    ...syncData,
    ...newSyncData,
  };
  return saveSyncData(updatedSyncData);
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

export const updateUserCfg = async (cfg: Partial<UserCfg>): Promise<void> => {
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    cfg: {
      ...syncData.cfg,
      ...cfg,
    },
  };
  return saveSyncData(newSyncData);
};

//

export const countOpeningAttempt = async (): Promise<void> => {
  const ds = getIsoDate();
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    attempts: {
      ...syncData.attempts,
      [ds]: syncData.attempts[ds] ? syncData.attempts[ds] + 1 : 1,
    },
  };
  return saveSyncData(newSyncData);
};

export const countSunTap = async (): Promise<void> => {
  const ds = getIsoDate();
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    sunTaps: {
      ...syncData.sunTaps,
      [ds]: syncData.sunTaps[ds] ? syncData.sunTaps[ds] + 1 : 1,
    },
  };
  console.log({ newSyncData });

  return saveSyncData(newSyncData);
};

export const rateCurrentBrowsingBehavior = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  const ds = getIsoDate(new Date(dateTS));
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    lastBrowsingBehaviorRatingTS: dateTS,
    browsingBehaviorRating: {
      ...syncData.browsingBehaviorRating,
      [ds]: val,
    },
  };
  return saveSyncData(newSyncData);
};

export const rateCurrentAppUsage = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  const ds = getIsoDate(new Date(dateTS));
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    lastAppUsageRatingTS: dateTS,
    appUsageRating: {
      ...syncData.appUsageRating,
      [ds]: val,
    },
  };
  return saveSyncData(newSyncData);
};

export const saveSelfAssessment = async (
  selfAssessmentId: SelfAssessmentId,
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    selfAssessment: {
      ...syncData.selfAssessment,
      [selfAssessmentId]: {
        ts: dateTS,
        val,
      },
    },
  };
  return saveSyncData(newSyncData);
};

export const updateBlockedApps = async (
  blockedApps: string[],
): Promise<void> => {
  return updateUserCfg({
    blockedApps,
  });
};

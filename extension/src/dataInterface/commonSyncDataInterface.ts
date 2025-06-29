import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { Answer, SyncData, UserCfg } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import {
  getSyncDataN,
  saveAnswerN,
  saveSyncDataN,
  // @ts-ignore
} from "@dataInterface/syncDataInterface";
import {
  IS_ANDROID as IS_ANDROID_N,
  IS_APP as IS_APP_N,
  IS_IOS as IS_IOS_N,
  IS_WEB_EXT as IS_WEB_EXT_N,
  // @ts-ignore
} from "@dataInterface/system";

import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";
import { DailyQuestionsMode } from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";

export const getSyncData: () => Promise<SyncData> = getSyncDataN;
export const saveSyncData: (syncData: SyncData) => Promise<void> =
  saveSyncDataN;
export const saveAnswer: (answer: Answer) => Promise<void> = saveAnswerN;

export const IS_ANDROID: boolean = IS_ANDROID_N;
export const IS_IOS: boolean = IS_IOS_N;
export const IS_APP: boolean = IS_APP_N;
export const IS_WEB_EXT: boolean = IS_WEB_EXT_N;

console.log({ IS_ANDROID, IS_IOS, IS_WEB_EXT, IS_APP });

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
      moodCheckAdditional: additional || "",
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

export const saveAlternativeApp = (alternative: string): Promise<void> => {
  return getSyncData().then((syncData) => {
    return saveSyncData({
      ...syncData,
      alternativeApps: [...syncData.alternativeApps, alternative],
    });
  });
};

export const saveAlternativeWebsite = (alternative: string): Promise<void> => {
  return getSyncData().then((syncData) => {
    return saveSyncData({
      ...syncData,
      alternativeWebsites: [...syncData.alternativeWebsites, alternative],
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
      // getSyncData().then(console.log);
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
      // getSyncData().then(console.log);
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

// TODO rename to something better
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

export const setDailyQuestionsDoneForToday = async (
  mode: DailyQuestionsMode,
  dateTS = Date.now(),
): Promise<void> => {
  const syncData = await getSyncData();
  const newSyncData: SyncData = {
    ...syncData,
    ...(mode === "Morning"
      ? { dailyQuestionsMorningTS: dateTS }
      : { dailyQuestionsEveningTS: dateTS }),
  };
  return saveSyncData(newSyncData);
};

export const rateCurrentAppUsage = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  const ds = getIsoDate(new Date(dateTS - 1000 * 60 * 60 * 24 * 3));
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

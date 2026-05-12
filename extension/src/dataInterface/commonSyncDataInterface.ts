import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import type {
  Alternative,
  Answer,
  SyncData,
  UserCfg,
} from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import {
  getSyncDataN,
  saveAnswerN,
  saveSyncDataN,
  // @ts-ignore - path alias resolved at build time based on platform
} from "@dataInterface/syncDataInterface";
import {
  IS_ANDROID as IS_ANDROID_N,
  IS_APP as IS_APP_N,
  IS_IOS as IS_IOS_N,
  IS_WEB_EXT as IS_WEB_EXT_N,
  // @ts-ignore - path alias resolved at build time based on platform
} from "@dataInterface/system";

import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";
import { DailyQuestionsMode } from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import { getRecentSunTapTimestamps } from "@src/dataInterface/sunTapHistory";
import {
  updateSyncDataField,
  incrementDateKeyedCounter,
} from "@src/dataInterface/updateSyncDataHelpers";
import {
  applyAlternativeDisabled,
  applyAlternativeStatEvent,
} from "@src/shared/components/interaction/alternatives/alternativeStats";
import type { AlternativeStatEvent } from "@src/shared/components/interaction/alternatives/alternativeStats";

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
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, () => newSyncData);

export const saveMoodCheckIn = (
  mood: MoodCheckinVal,
  additional?: string,
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, () => ({
    moodCheckTS: Date.now(),
    moodCheckVal: mood,
    moodCheckAdditional: additional || "",
  }));

export const saveEnergyLvl = (energyLvlVal: number): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, () => ({
    energyLvlTS: Date.now(),
    energyLvlVal,
  }));

export const saveAlternativeApp = (alternative: string): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    alternativeApps: [...syncData.alternativeApps, alternative],
  }));

export const saveAlternativeWebsite = (alternative: string): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    alternativeWebsites: [...syncData.alternativeWebsites, alternative],
  }));

const markAlternative = (
  alternative: Alternative,
  event: AlternativeStatEvent,
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    alternatives: applyAlternativeStatEvent(
      syncData.alternatives,
      alternative,
      event,
      Date.now(),
    ),
  }));

export const markAlternativeShown = (alternative: Alternative): Promise<void> =>
  markAlternative(alternative, "shown");

export const markAlternativeOpened = (
  alternative: Alternative,
): Promise<void> => markAlternative(alternative, "opened");

export const markAlternativeOpenedAndCountSunTap = (
  alternative: Alternative,
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => {
    const now = Date.now();
    const ds = getIsoDate(new Date(now));
    const currentSunTaps = syncData.sunTaps[ds] || 0;

    return {
      alternatives: applyAlternativeStatEvent(
        syncData.alternatives,
        alternative,
        "opened",
        now,
      ),
      sunTaps: {
        ...syncData.sunTaps,
        [ds]: currentSunTaps + 1,
      },
      sunTapTimestamps: [
        ...getRecentSunTapTimestamps(syncData.sunTapTimestamps ?? [], now),
        now,
      ],
    };
  });

export const markAlternativeDismissed = (
  alternative: Alternative,
): Promise<void> => markAlternative(alternative, "dismissed");

export const disableAlternative = (alternative: Alternative): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    alternatives: applyAlternativeDisabled(
      syncData.alternatives,
      alternative,
      Date.now(),
    ),
  }));

export const updateAnswer = (answerToUpdate: Answer): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    answers: syncData.answers.map((aI) =>
      aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
    ),
  }));

export const removeAnswer = (answerId: string): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    answers: syncData.answers.filter((aI) => aI.id !== answerId),
  }));

export const updateUserCfg = async (cfg: Partial<UserCfg>): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    cfg: { ...syncData.cfg, ...cfg },
  }));

export const countOpeningAttempt = (): Promise<void> =>
  incrementDateKeyedCounter(getSyncData, saveSyncData, "attempts");

export const countSunTap = (): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => {
    const now = Date.now();
    const ds = getIsoDate(new Date(now));
    const currentSunTaps = syncData.sunTaps[ds] || 0;

    return {
      sunTaps: {
        ...syncData.sunTaps,
        [ds]: currentSunTaps + 1,
      },
      sunTapTimestamps: [
        ...getRecentSunTapTimestamps(syncData.sunTapTimestamps ?? [], now),
        now,
      ],
    };
  });

export const rateCurrentBrowsingBehavior = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  const ds = getIsoDate(new Date(dateTS));
  return updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    lastBrowsingBehaviorRatingTS: dateTS,
    browsingBehaviorRating: { ...syncData.browsingBehaviorRating, [ds]: val },
  }));
};

export const setDailyQuestionsDoneForToday = async (
  mode: DailyQuestionsMode,
  dateTS = Date.now(),
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, () =>
    mode === "Morning"
      ? { dailyQuestionsMorningTS: dateTS }
      : { dailyQuestionsEveningTS: dateTS },
  );

export const rateCurrentAppUsage = async (
  val: number,
  dateTS = Date.now(),
): Promise<void> => {
  // Use date 3 days ago for app usage rating
  const ds = getIsoDate(new Date(dateTS - 1000 * 60 * 60 * 24 * 3));
  return updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    lastAppUsageRatingTS: dateTS,
    appUsageRating: { ...syncData.appUsageRating, [ds]: val },
  }));
};

export const saveSelfAssessment = async (
  selfAssessmentId: SelfAssessmentId,
  val: number,
  dateTS = Date.now(),
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    selfAssessment: {
      ...syncData.selfAssessment,
      [selfAssessmentId]: { ts: dateTS, val },
    },
  }));

export const saveEmotionLabeling = (
  emotions: string[],
  bodyLocations: string[],
): Promise<void> =>
  updateSyncDataField(getSyncData, saveSyncData, () => ({
    emotionLabeling: { ts: Date.now(), emotions, bodyLocations },
  }));

export const updateBlockedApps = (blockedApps: string[]): Promise<void> =>
  updateUserCfg({ blockedApps });

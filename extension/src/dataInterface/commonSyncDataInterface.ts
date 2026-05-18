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
  patchSyncDataN,
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
import {
  createUserAppAlternative,
  createUserWebsiteAlternative,
} from "@src/shared/components/interaction/alternatives/getAlternatives";
import {
  markPatternInsightShownInState,
  type PatternInsight,
} from "@src/shared/components/interaction/patternInsight/patternInsight";

export const getSyncData: () => Promise<SyncData> = getSyncDataN;
export const saveSyncData: (syncData: SyncData) => Promise<void> =
  saveSyncDataN;
export const patchSyncData: (
  syncDataPatch: Partial<SyncData>,
) => Promise<void> = patchSyncDataN;
export const saveAnswer: (answer: Answer) => Promise<void> = saveAnswerN;

export const IS_ANDROID: boolean = IS_ANDROID_N;
export const IS_IOS: boolean = IS_IOS_N;
export const IS_APP: boolean = IS_APP_N;
export const IS_WEB_EXT: boolean = IS_WEB_EXT_N;

console.log({ IS_ANDROID, IS_IOS, IS_WEB_EXT, IS_APP });

export const updateSyncData = async (
  newSyncData: Partial<SyncData>,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => newSyncData);

export const saveMoodCheckIn = (
  mood: MoodCheckinVal,
  additional?: string,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => ({
    moodCheckTS: Date.now(),
    moodCheckVal: mood,
    moodCheckAdditional: additional || "",
  }));

export const saveEnergyLvl = (energyLvlVal: number): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => ({
    energyLvlTS: Date.now(),
    energyLvlVal,
  }));

export const saveAlternativeApp = (alternative: string): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    alternativeApps: [...syncData.alternativeApps, alternative],
  }));

export const saveAlternativeWebsite = (alternative: string): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    alternativeWebsites: [...syncData.alternativeWebsites, alternative],
  }));

const upsertAlternative = (
  alternatives: Alternative[] | undefined,
  alternative: Alternative,
): Alternative[] => {
  const currentAlternatives = alternatives ?? [];
  const updatedAlternatives = currentAlternatives.map((existingAlternative) =>
    existingAlternative.id === alternative.id
      ? removeAlternativeDisabledTS({ ...existingAlternative, ...alternative })
      : existingAlternative,
  );

  return updatedAlternatives.some(
    (existingAlternative) => existingAlternative.id === alternative.id,
  )
    ? updatedAlternatives
    : [...updatedAlternatives, alternative];
};

const removeAlternativeDisabledTS = (alternative: Alternative): Alternative => {
  const enabledAlternative = { ...alternative };
  delete enabledAlternative.disabledTS;
  return enabledAlternative;
};

export const saveAlternative = (alternative: Alternative): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    alternatives: upsertAlternative(syncData.alternatives, alternative),
  }));

const replaceAlternative = (
  alternatives: Alternative[] | undefined,
  currentAlternative: Alternative,
  replacementAlternative: Alternative,
  now: number,
): Alternative[] => {
  const updatedAlternatives =
    currentAlternative.id === replacementAlternative.id
      ? alternatives
      : applyAlternativeDisabled(alternatives, currentAlternative, now);

  return upsertAlternative(updatedAlternatives, replacementAlternative);
};

export const saveReplacementAlternative = (
  currentAlternative: Alternative,
  replacementAlternative: Alternative,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    alternatives: replaceAlternative(
      syncData.alternatives,
      currentAlternative,
      replacementAlternative,
      Date.now(),
    ),
  }));

export const saveStructuredAlternativeApp = (
  alternative: string,
): Promise<void> => saveAlternative(createUserAppAlternative(alternative));

export const saveStructuredAlternativeWebsite = (
  alternative: string,
): Promise<void> => saveAlternative(createUserWebsiteAlternative(alternative));

export const saveReplacementStructuredAlternativeApp = (
  currentAlternative: Alternative,
  replacement: string,
): Promise<void> =>
  saveReplacementAlternative(
    currentAlternative,
    createUserAppAlternative(replacement),
  );

export const saveReplacementStructuredAlternativeWebsite = (
  currentAlternative: Alternative,
  replacement: string,
): Promise<void> =>
  saveReplacementAlternative(
    currentAlternative,
    createUserWebsiteAlternative(replacement),
  );

const markAlternative = (
  alternative: Alternative,
  event: AlternativeStatEvent,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    alternatives: applyAlternativeStatEvent(
      syncData.alternatives,
      alternative,
      event,
      Date.now(),
    ),
  }));

export const markAlternativeShown = (alternative: Alternative): Promise<void> =>
  markAlternative(alternative, "shown");

export const markPatternInsightShown = (
  insight: PatternInsight,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    patternInsightState: markPatternInsightShownInState(
      syncData.patternInsightState,
      insight.id,
      insight.dateISO,
    ),
  }));

export const updateAnswer = (answerToUpdate: Answer): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    answers: syncData.answers.map((aI) =>
      aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
    ),
  }));

export const removeAnswer = (answerId: string): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    answers: syncData.answers.filter((aI) => aI.id !== answerId),
  }));

export const updateUserCfg = async (cfg: Partial<UserCfg>): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    cfg: { ...syncData.cfg, ...cfg },
  }));

export const countOpeningAttempt = (): Promise<void> =>
  incrementDateKeyedCounter(getSyncData, patchSyncData, "attempts");

export const countSunTap = (): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => {
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
  return updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    lastBrowsingBehaviorRatingTS: dateTS,
    browsingBehaviorRating: { ...syncData.browsingBehaviorRating, [ds]: val },
  }));
};

export const setDailyQuestionsDoneForToday = async (
  mode: DailyQuestionsMode,
  dateTS = Date.now(),
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () =>
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
  return updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    lastAppUsageRatingTS: dateTS,
    appUsageRating: { ...syncData.appUsageRating, [ds]: val },
  }));
};

export const saveSelfAssessment = async (
  selfAssessmentId: SelfAssessmentId,
  val: number,
  dateTS = Date.now(),
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
    selfAssessment: {
      ...syncData.selfAssessment,
      [selfAssessmentId]: { ts: dateTS, val },
    },
  }));

export const saveEmotionLabeling = (
  emotions: string[],
  bodyLocations: string[],
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => ({
    emotionLabeling: { ts: Date.now(), emotions, bodyLocations },
  }));

export const updateBlockedApps = (blockedApps: string[]): Promise<void> =>
  updateUserCfg({ blockedApps });

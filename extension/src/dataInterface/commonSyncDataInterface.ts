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
  getUsageObservationRawN,
  // @ts-ignore - path alias resolved at build time based on platform
} from "@dataInterface/syncDataInterface";
import {
  IS_ANDROID as IS_ANDROID_N,
  IS_APP as IS_APP_N,
  IS_IOS as IS_IOS_N,
  IS_WEB_EXT as IS_WEB_EXT_N,
  // @ts-ignore - path alias resolved at build time based on platform
} from "@dataInterface/system";

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
import type { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import {
  computeUsageObservation,
  type UsageObservation,
  type UsageTarget,
} from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageObservation";

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

export const updateSyncData = async (
  newSyncData: Partial<SyncData>,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => newSyncData);

export const saveEnergyLvl = (energyLvlVal: number): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => ({
    energyLvlTS: Date.now(),
    energyLvlVal,
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

/**
 * Build the sunTaps counter + recent-timestamps update for a single tap.
 * Shared by countSunTap and markAlternativeOpenedAndCountSunTap.
 */
const bumpSunTap = (
  syncData: SyncData,
  now: number,
): Pick<SyncData, "sunTaps" | "sunTapTimestamps"> => {
  const ds = getIsoDate(new Date(now));
  return {
    sunTaps: {
      ...syncData.sunTaps,
      [ds]: (syncData.sunTaps[ds] || 0) + 1,
    },
    sunTapTimestamps: [
      ...getRecentSunTapTimestamps(syncData.sunTapTimestamps ?? [], now),
      now,
    ],
  };
};

export const markAlternativeOpenedAndCountSunTap = (
  alternative: Alternative,
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, (syncData) => {
    const now = Date.now();
    return {
      alternatives: applyAlternativeStatEvent(
        syncData.alternatives,
        alternative,
        "opened",
        now,
      ),
      ...bumpSunTap(syncData, now),
    };
  });

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

/**
 * Remember the mode the last router-decided intervention opened with, powering
 * getInteractionMode's anti-repeat fallback. Stores the full mode (not a boolean)
 * so the memory updates after a NOTICE too. A plain key patch — no read needed,
 * since the value doesn't depend on current state.
 */
export const markInteractionModeShown = (
  mode: InteractionMode,
): Promise<void> => patchSyncData({ lastInteractionMode: mode });

/**
 * Record that tonight's wind-down settle has been shown, so the engine serves
 * it at most once per night (getInteractionMode's `settledTonight` guard). The
 * caller passes the night id it is settling — the same `resolveNightId(cfg, now)`
 * value the decision compared against — so the two always agree. A plain key
 * patch; the value doesn't depend on current state.
 */
export const markBedtimeSettled = (nightId: string): Promise<void> =>
  patchSyncData({ sleepWindDownDismissedNightId: nightId });

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
  updateSyncDataField(getSyncData, patchSyncData, (syncData) =>
    bumpSunTap(syncData, Date.now()),
  );

/**
 * Present-moment, judgment-free read of actual usage — the replacement for the
 * old Great→Awful self-rating. Extension computes it from observed `usageStats`;
 * Android reads real per-app foreground time from the OS via the native bridge.
 * Returns null when there's no usable signal (e.g. Android usage-access not
 * granted, or iOS).
 */
export const getUsageObservation =
  async (): Promise<UsageObservation | null> => {
    if (IS_ANDROID) {
      return parseAndroidUsageObservation(getUsageObservationRawN());
    }
    if (IS_WEB_EXT) {
      const syncData = await getSyncData();
      return computeUsageObservation(syncData.usageStats, Date.now());
    }
    return null;
  };

const parseAndroidUsageObservation = (
  raw: string | null,
): UsageObservation | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UsageObservation>;
    if (!Number.isFinite(parsed.todaySeconds)) return null;
    const topTargets: UsageTarget[] = Array.isArray(parsed.topTargets)
      ? parsed.topTargets.filter(
          (t): t is UsageTarget =>
            !!t &&
            typeof t.id === "string" &&
            typeof t.label === "string" &&
            typeof t.seconds === "number" &&
            Number.isFinite(t.seconds),
        )
      : [];
    return {
      todaySeconds: parsed.todaySeconds as number,
      topTargets,
    };
  } catch {
    return null;
  }
};

/**
 * Throttle marker for the usage-observation interaction. Reuses the dormant
 * `last*RatingTS` fields (kept for storage-shape stability) as the "last shown"
 * timestamp that getInteractionMode reads.
 */
export const markUsageObservationShown = (dateTS = Date.now()): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () =>
    IS_ANDROID
      ? { lastAppUsageRatingTS: dateTS }
      : { lastBrowsingBehaviorRatingTS: dateTS },
  );

export const setDailyQuestionsDoneForToday = async (
  mode: DailyQuestionsMode,
  dateTS = Date.now(),
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () =>
    mode === "Morning"
      ? { dailyQuestionsMorningTS: dateTS }
      : { dailyQuestionsEveningTS: dateTS },
  );

export const saveEmotionLabeling = (
  emotions: string[],
  bodyLocations: string[],
): Promise<void> =>
  updateSyncDataField(getSyncData, patchSyncData, () => ({
    emotionLabeling: { ts: Date.now(), emotions, bodyLocations },
  }));

export const updateBlockedApps = (blockedApps: string[]): Promise<void> =>
  updateUserCfg({ blockedApps });

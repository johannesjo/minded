import {
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import type {
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";
import {
  IS_ANDROID,
  IS_APP,
  IS_IOS,
} from "@src/dataInterface/commonSyncDataInterface";
import { isMain } from "@src/shared/isMain.const";
import { QuestionCategoryId } from "@src/shared/data/questions";
import {
  FrictionLevel,
  getFrictionLevel,
  getInteractionContext,
} from "@src/shared/components/interaction/interactionContext";
import { getIsoDate } from "@src/util/getIsoDate";

const LAST_MOOD_CHECKIN_MIN_GAP = 2 * 60 * 60 * 1000;
const TODAY_START_HOUR = 5;
const ENERGY_LVL_MAX_HOURS = 19;
const CONTEXTUAL_ALTERNATIVE_PROBABILITY = 1 / 3;
const SET_ALTERNATIVE_PROBABILITY = 1 / 10;
const SELF_ASSESSMENT_PROBABILITY = 1 / 10;
const EMOTION_LABELING_PROBABILITY = 1 / 10;
const MOOD_CHECKIN_STALE_PROBABILITY = 1 / 50;
const SAVED_REASON_PROBABILITY = 1 / 15;
const USAGE_RATING_DUE_PROBABILITY = 1 / 3;
const USAGE_RATING_TODAY_PROBABILITY = 1 / 20;
const ACTION_ADVICE_PROBABILITY = 1 / 20;
const EMOJI_CHECKIN_PROBABILITY = 1 / 100;

export type InteractionMode =
  | "ENERGY_LVL"
  | "APP_USAGE_OR_BROWSING_BEHAVIOR"
  | "ACTION_ADVICE"
  | "EMOJI_CHECKIN"
  | "QUESTION"
  | "SHOW_ALTERNATIVE"
  | "SET_ALTERNATIVE"
  | "MOOD_CHECKIN"
  | "SELF_ASSESSMENT"
  | "EMOTION_LABELING"
  | "SHOW_REASON";

export type InteractionModeReason =
  | "few_answers_question"
  | "strong_friction_saved_reason"
  | "strong_friction_alternative"
  | "strong_friction_question"
  | "expired_intent_saved_reason"
  | "expired_intent_alternative"
  | "mood_missing"
  | "energy_missing"
  | "evening_action_advice"
  | "contextual_alternative"
  | "contextual_set_alternative"
  | "self_assessment_sample"
  | "emotion_labeling_sample"
  | "mood_checkin_stale_sample"
  | "alternative_sample"
  | "set_alternative_sample"
  | "saved_reason_sample"
  | "usage_rating_due"
  | "action_advice_sample"
  | "emoji_checkin_sample"
  | "fallback_question";

export interface InteractionModeDecision {
  mode: InteractionMode;
  reason: InteractionModeReason;
  frictionLevel: FrictionLevel;
}

export interface InteractionModeDecisionOptions {
  clock?: () => number;
  random?: () => number;
  target?: SessionTarget;
  platform?: SessionPlatform;
  isMainView?: boolean;
  isApp?: boolean;
  isAndroid?: boolean;
}

const decision = (
  mode: InteractionMode,
  reason: InteractionModeReason,
  frictionLevel: FrictionLevel,
): InteractionModeDecision => ({ mode, reason, frictionLevel });

const chance = (probability: number, random: () => number): boolean =>
  random() < probability;

const isSameLocalDate = (
  leftTS: number | undefined,
  rightTS: number,
): boolean =>
  !!leftTS &&
  leftTS > 0 &&
  getIsoDate(new Date(leftTS)) === getIsoDate(new Date(rightTS));

const hasHappenedInLastXDaysAt = (
  ts: number,
  days: number,
  now: number,
): boolean => ts >= now - days * 24 * 60 * 60 * 1000;

const getDefaultPlatform = (): SessionPlatform =>
  IS_ANDROID ? "android" : IS_IOS ? "ios" : "web";

const getReasonAnswerCount = (syncData: SyncData, isAppMode: boolean): number =>
  syncData.answers.filter(
    (a) =>
      a.questionCategoryId ===
      (isAppMode
        ? QuestionCategoryId.WhyReduceAppUsage
        : QuestionCategoryId.WhyReduceBrowsing),
  ).length;

export const getInteractionModeDecision = (
  syncData: SyncData,
  options: InteractionModeDecisionOptions = {},
): InteractionModeDecision => {
  // return "EMOTION_LABELING";
  // return "APP_USAGE_OR_BROWSING_BEHAVIOR";
  // return "ACTION_ADVICE";
  // return "MOOD_CHECKIN";
  // return "ENERGY_LVL";
  // return "EMOJI_CHECKIN";
  // return "SELF_ASSESSMENT";
  // return "SHOW_ALTERNATIVE";
  // return "SET_ALTERNATIVE";

  const nowTS = options.clock?.() ?? Date.now();
  const platform = options.platform ?? getDefaultPlatform();
  const context = getInteractionContext({
    syncData,
    now: nowTS,
    target: options.target,
    platform,
  });
  const frictionLevel = getFrictionLevel(context);
  const random = options.random ?? Math.random;
  const isMainView = options.isMainView ?? isMain();
  const isAppMode =
    options.isApp ??
    (options.target
      ? options.target.kind === "app"
      : platform !== "web" || IS_APP);
  const isAndroidMode = options.isAndroid ?? platform === "android";
  const hasReasonAnswers = getReasonAnswerCount(syncData, isAppMode) > 0;
  const canShowAlternative = !isMainView && context.hasAlternatives;
  const canAskForAlternative = !isMainView && !context.hasAlternatives;
  const isEnergyEligible =
    context.localHour >= TODAY_START_HOUR &&
    context.localHour < ENERGY_LVL_MAX_HOURS;
  const isActionAdviceEligible =
    context.localHour < ACTION_ADVICES_MAX_HOUR &&
    context.localHour >= ACTION_ADVICES_MIN_HOUR;

  if (context.hasFewAnswers) {
    return decision("QUESTION", "few_answers_question", frictionLevel);
  }

  if (frictionLevel === "strong") {
    if (hasReasonAnswers) {
      return decision(
        "SHOW_REASON",
        "strong_friction_saved_reason",
        frictionLevel,
      );
    }
    if (canShowAlternative) {
      return decision(
        "SHOW_ALTERNATIVE",
        "strong_friction_alternative",
        frictionLevel,
      );
    }
    return decision("QUESTION", "strong_friction_question", frictionLevel);
  }

  if (context.hasIntentOnExpiredTimerForTarget) {
    if (hasReasonAnswers) {
      return decision(
        "SHOW_REASON",
        "expired_intent_saved_reason",
        frictionLevel,
      );
    }
    if (canShowAlternative) {
      return decision(
        "SHOW_ALTERNATIVE",
        "expired_intent_alternative",
        frictionLevel,
      );
    }
  }

  if (!context.hasFreshMood) {
    return decision("MOOD_CHECKIN", "mood_missing", frictionLevel);
  }

  if (isEnergyEligible && !context.hasFreshEnergy) {
    return decision("ENERGY_LVL", "energy_missing", frictionLevel);
  }

  if (context.isEvening && isActionAdviceEligible) {
    return decision("ACTION_ADVICE", "evening_action_advice", frictionLevel);
  }

  if (
    canShowAlternative &&
    chance(CONTEXTUAL_ALTERNATIVE_PROBABILITY, random)
  ) {
    return decision(
      "SHOW_ALTERNATIVE",
      "contextual_alternative",
      frictionLevel,
    );
  }

  if (canAskForAlternative && chance(SET_ALTERNATIVE_PROBABILITY, random)) {
    return decision(
      "SET_ALTERNATIVE",
      "contextual_set_alternative",
      frictionLevel,
    );
  }

  if (chance(SELF_ASSESSMENT_PROBABILITY, random)) {
    return decision("SELF_ASSESSMENT", "self_assessment_sample", frictionLevel);
  }

  if (
    !isSameLocalDate(syncData.emotionLabeling?.ts, nowTS) &&
    chance(EMOTION_LABELING_PROBABILITY, random)
  ) {
    return decision(
      "EMOTION_LABELING",
      "emotion_labeling_sample",
      frictionLevel,
    );
  }

  if (
    context.moodCheckAgeMs !== null &&
    context.moodCheckAgeMs > LAST_MOOD_CHECKIN_MIN_GAP &&
    chance(MOOD_CHECKIN_STALE_PROBABILITY, random)
  ) {
    return decision("MOOD_CHECKIN", "mood_checkin_stale_sample", frictionLevel);
  }

  if (hasReasonAnswers && chance(SAVED_REASON_PROBABILITY, random)) {
    return decision("SHOW_REASON", "saved_reason_sample", frictionLevel);
  }

  const ratingTS = isAndroidMode
    ? syncData.lastAppUsageRatingTS
    : syncData.lastBrowsingBehaviorRatingTS;
  if (
    (!hasHappenedInLastXDaysAt(ratingTS, 2, nowTS) &&
      chance(USAGE_RATING_DUE_PROBABILITY, random)) ||
    (!isSameLocalDate(ratingTS, nowTS) &&
      chance(USAGE_RATING_TODAY_PROBABILITY, random))
  ) {
    return decision(
      "APP_USAGE_OR_BROWSING_BEHAVIOR",
      "usage_rating_due",
      frictionLevel,
    );
  }

  if (isActionAdviceEligible && chance(ACTION_ADVICE_PROBABILITY, random)) {
    return decision("ACTION_ADVICE", "action_advice_sample", frictionLevel);
  }

  if (chance(EMOJI_CHECKIN_PROBABILITY, random)) {
    return decision("EMOJI_CHECKIN", "emoji_checkin_sample", frictionLevel);
  }

  return decision("QUESTION", "fallback_question", frictionLevel);
};

export const getInteractionMode = (
  syncData: SyncData,
  options?: InteractionModeDecisionOptions,
): InteractionMode => getInteractionModeDecision(syncData, options).mode;

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
import {
  getPatternInsightCandidate,
  type PatternInsight,
} from "@src/shared/components/interaction/patternInsight/patternInsight";
import { getIsoDate } from "@src/util/getIsoDate";

const TODAY_START_HOUR = 5;
const ENERGY_LVL_MAX_HOURS = 19;
const CONTEXTUAL_ALTERNATIVE_PROBABILITY = 1 / 3;
const SET_ALTERNATIVE_PROBABILITY = 1 / 10;
const SELF_ASSESSMENT_PROBABILITY = 1 / 10;
const EMOTION_LABELING_PROBABILITY = 1 / 10;
const SAVED_REASON_PROBABILITY = 1 / 15;
const USAGE_RATING_DUE_PROBABILITY = 1 / 3;
const USAGE_RATING_TODAY_PROBABILITY = 1 / 20;
const ACTION_ADVICE_PROBABILITY = 1 / 20;
// A present-moment "notice → tap" anchor: a gentle, no-typing fallback offered
// when nothing more specific is due. Rarer than action advice.
const NOTICE_PROBABILITY = 1 / 30;
const PATTERN_INSIGHT_PROBABILITY = 1 / 3;
// Share of strong-friction Android interventions that ask for a screen-off
// minute (the rest fall through to the existing strong-friction prompts).
const SCREEN_OFF_PROBABILITY = 1 / 3;
// Share of (remaining) strong-friction interventions that offer urge surfing.
// Strong friction means the pull is highest — exactly when riding the urge out
// is the right practice. Cross-platform, unlike the Android-only screen-off.
const URGE_SURFING_PROBABILITY = 1 / 3;

export type InteractionMode =
  | "ENERGY_LVL"
  | "APP_USAGE_OR_BROWSING_BEHAVIOR"
  | "ACTION_ADVICE"
  | "NOTICE"
  | "QUESTION"
  | "SHOW_ALTERNATIVE"
  | "SET_ALTERNATIVE"
  | "SELF_ASSESSMENT"
  | "EMOTION_LABELING"
  | "SHOW_REASON"
  | "PATTERN_INSIGHT"
  | "SCREEN_OFF"
  | "URGE_SURFING";

export type InteractionModeReason =
  | "few_answers_question"
  | "strong_friction_saved_reason"
  | "strong_friction_pattern_insight"
  | "strong_friction_alternative"
  | "strong_friction_question"
  | "expired_intent_saved_reason"
  | "expired_intent_alternative"
  | "energy_missing"
  | "evening_action_advice"
  | "contextual_alternative"
  | "contextual_set_alternative"
  | "contextual_pattern_insight"
  | "self_assessment_sample"
  | "emotion_labeling_sample"
  | "alternative_sample"
  | "set_alternative_sample"
  | "saved_reason_sample"
  | "usage_rating_due"
  | "action_advice_sample"
  | "notice_sample"
  | "screen_off_strong"
  | "urge_surfing_strong"
  | "fallback_question";

export interface InteractionModeDecision {
  mode: InteractionMode;
  reason: InteractionModeReason;
  frictionLevel: FrictionLevel;
  patternInsight?: PatternInsight;
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
  patternInsight?: PatternInsight,
): InteractionModeDecision => ({
  mode,
  reason,
  frictionLevel,
  ...(patternInsight ? { patternInsight } : {}),
});

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
  // return "ENERGY_LVL";
  // return "NOTICE";
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
  const canApplyInterventionFriction = !isMainView;
  const hasReasonAnswers = getReasonAnswerCount(syncData, isAppMode) > 0;
  const canShowAlternative = !isMainView && context.hasAlternatives;
  const canAskForAlternative = !isMainView && !context.hasAlternatives;
  const isEnergyEligible =
    context.localHour >= TODAY_START_HOUR &&
    context.localHour < ENERGY_LVL_MAX_HOURS;
  const isActionAdviceEligible =
    context.localHour < ACTION_ADVICES_MAX_HOUR &&
    context.localHour >= ACTION_ADVICES_MIN_HOUR;
  const patternInsight =
    !isMainView && frictionLevel !== "soft"
      ? getPatternInsightCandidate(context, syncData.patternInsightState)
      : undefined;

  if (context.hasFewAnswers) {
    return decision("QUESTION", "few_answers_question", frictionLevel);
  }

  if (isEnergyEligible && !context.hasFreshEnergy) {
    return decision("ENERGY_LVL", "energy_missing", frictionLevel);
  }

  if (canApplyInterventionFriction && frictionLevel === "strong") {
    // Intentionally reuses the action-advice hour window (5:00–22:00); both
    // prompts should only fire during waking hours.
    if (
      isAndroidMode &&
      isActionAdviceEligible &&
      chance(SCREEN_OFF_PROBABILITY, random)
    ) {
      return decision("SCREEN_OFF", "screen_off_strong", frictionLevel);
    }

    if (isActionAdviceEligible && chance(URGE_SURFING_PROBABILITY, random)) {
      return decision("URGE_SURFING", "urge_surfing_strong", frictionLevel);
    }

    if (patternInsight) {
      return decision(
        "PATTERN_INSIGHT",
        "strong_friction_pattern_insight",
        frictionLevel,
        patternInsight,
      );
    }

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

  if (
    canApplyInterventionFriction &&
    context.hasIntentOnExpiredTimerForTarget
  ) {
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

  if (context.isEvening && isActionAdviceEligible) {
    return decision("ACTION_ADVICE", "evening_action_advice", frictionLevel);
  }

  const contextualRoll =
    patternInsight || canShowAlternative ? random() : undefined;

  if (
    patternInsight &&
    contextualRoll !== undefined &&
    contextualRoll < PATTERN_INSIGHT_PROBABILITY
  ) {
    return decision(
      "PATTERN_INSIGHT",
      "contextual_pattern_insight",
      frictionLevel,
      patternInsight,
    );
  }

  if (
    canShowAlternative &&
    contextualRoll !== undefined &&
    contextualRoll >= (patternInsight ? PATTERN_INSIGHT_PROBABILITY : 0) &&
    contextualRoll <
      (patternInsight ? PATTERN_INSIGHT_PROBABILITY : 0) +
        CONTEXTUAL_ALTERNATIVE_PROBABILITY
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

  if (chance(NOTICE_PROBABILITY, random)) {
    return decision("NOTICE", "notice_sample", frictionLevel);
  }

  return decision("QUESTION", "fallback_question", frictionLevel);
};

export const getInteractionMode = (
  syncData: SyncData,
  options?: InteractionModeDecisionOptions,
): InteractionMode => getInteractionModeDecision(syncData, options).mode;

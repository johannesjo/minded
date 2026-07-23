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
import { getIsMediaAudible } from "@src/shared/components/interaction/bell/isMediaAudible";
import { getIsoDate } from "@src/util/getIsoDate";

const TODAY_START_HOUR = 5;
const ENERGY_LVL_MAX_HOURS = 19;
const CONTEXTUAL_ALTERNATIVE_PROBABILITY = 1 / 3;
const SET_ALTERNATIVE_PROBABILITY = 1 / 10;
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
// Strong friction means the pull is highest - exactly when riding the urge out
// is the right practice. Cross-platform, unlike the Android-only screen-off.
const URGE_SURFING_PROBABILITY = 1 / 3;
// Share of (remaining) strong-friction interventions that ring the bell -
// one strike, listened all the way down into silence. Deliberately below
// urge surfing (at peak pull the urge work is the more specific practice)
// and below a ready pattern insight (see the strong branch).
const BELL_PROBABILITY = 1 / 4;
// Rare everyday appearance of the bell, in the same "nothing more specific is
// due" register as NOTICE (and slightly more common than it, being the richer
// moment of the two).
const BELL_SAMPLE_PROBABILITY = 1 / 25;
// The one wordless intervention: no question, no advice - an invitation to let
// the scrolling finger be still for a moment. Same everyday register as the
// bell and NOTICE; unlike them it needs no sound and no waking-hours gate, so
// it is also the softest thing the small hours can serve.
const FINGER_REST_PROBABILITY = 1 / 20;

export type InteractionMode =
  | "ENERGY_LVL"
  | "APP_USAGE_OR_BROWSING_BEHAVIOR"
  | "ACTION_ADVICE"
  | "NOTICE"
  | "QUESTION"
  | "SHOW_ALTERNATIVE"
  | "SET_ALTERNATIVE"
  | "EMOTION_LABELING"
  | "SHOW_REASON"
  | "PATTERN_INSIGHT"
  | "SCREEN_OFF"
  | "URGE_SURFING"
  | "BELL"
  | "FINGER_REST"
  | "WIND_DOWN_SETTLE";

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
  | "emotion_labeling_sample"
  | "alternative_sample"
  | "set_alternative_sample"
  | "saved_reason_sample"
  | "usage_rating_due"
  | "action_advice_sample"
  | "notice_sample"
  | "screen_off_strong"
  | "urge_surfing_strong"
  | "bell_strong"
  | "bell_sample"
  | "finger_rest_sample"
  | "bedtime_settle"
  | "bedtime_settle_strong"
  | "bedtime_settled_notice"
  | "fallback_question"
  | "fallback_anti_repeat_notice";

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
  /**
   * Whether a rung bell could actually be heard right now (media volume /
   * platform). Defaults to the live device read; injectable for tests.
   */
  isAudioAudible?: boolean;
  /**
   * Whether the primary input is touch. The finger-rest invitation is a
   * press-and-hold on a pad - meaningless with a mouse - so it is only offered
   * on touch-primary devices. The live device read (`IS_TOUCH_PRIMARY`) lives
   * in `@src/util/touch`, which touches `window` at import; passing it in keeps
   * this decision module DOM-free (and node-testable). Defaults to `false` so
   * an unknown environment fails safe - never inviting a finger to rest where
   * there is only a mouse.
   */
  isTouchPrimary?: boolean;
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
  const isTouchPrimary = options.isTouchPrimary ?? false;
  const canApplyInterventionFriction = !isMainView;
  // Sleep wind-down as a register of the standard flow: inside the user's
  // configured bedtime window a blocked-app interrupt serves the wordless
  // settle. Gated to real interventions (`canApplyInterventionFriction`) so the
  // settle never pops up on the dashboard (and never triggers the native
  // lock-screen close there).
  const isBedtimeIntervention =
    context.isBedtimeWindow && canApplyInterventionFriction;
  // One thing quiets it: once the user has already dealt with sleep tonight
  // through the guided wind-down flow (completing or skipping it records
  // tonight's night id, `sleepWindDownDismissedNightId`), the interrupt stops
  // re-serving the identical wordless moon this night - repeating it after the
  // user consciously wound down read as nagging (the very thing the settle must
  // not do). The blocked-app moon itself never writes this now (a tap continues,
  // a drag settles to sleep), so absent the guided flow the settle simply returns
  // on the next interrupt. The comparison is against the night id, so a stale
  // value from a previous night can never suppress tonight. This gate is
  // intentionally normal-tier only: a genuinely strong late-night pull still
  // reaches the wordless settle via the strong branch below (quiet-the-night is
  // scoped, not absolute).
  const isBedtimeSettleSettledTonight =
    context.bedtimeNightId !== null &&
    syncData.sleepWindDownDismissedNightId === context.bedtimeNightId;
  const canServeBedtimeSettle =
    isBedtimeIntervention && !isBedtimeSettleSettledTonight;
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
  // The bell is only offered when it could be heard: never with the Sound
  // setting off, never with the media volume at zero (a silent bell is a
  // broken moment, so the gate is structural rather than a setting). Kept to
  // real interventions (not the dashboard, whose sun already offers grounding)
  // and - like the other audible/attention prompts - to waking hours.
  const canOfferBell =
    !isMainView &&
    isActionAdviceEligible &&
    (syncData.cfg.soundEnabled ?? true) &&
    (options.isAudioAudible ?? getIsMediaAudible());

  // Never open a bedtime interrupt with a verbal survey. A first-night
  // onboarding QUESTION or a pre-19:00 ENERGY_LVL prompt at bedtime is a
  // textbook 90%-bar violation ("a form at the moment of least capacity"), so
  // inside a bedtime intervention these gates are skipped entirely - the window
  // falls through to the wordless settle (or, once settled, the ordinary
  // cascade). They still fire normally outside the bedtime window.
  if (context.hasFewAnswers && !isBedtimeIntervention) {
    return decision("QUESTION", "few_answers_question", frictionLevel);
  }

  if (isEnergyEligible && !context.hasFreshEnergy && !isBedtimeIntervention) {
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

    // Bedtime, strong pull: the active practices above (screen-off, urge
    // surfing) still fire when they're eligible - a genuinely strong late-night
    // pull deserves the real practice. But once they pass, a strong pull should
    // meet the wordless settle, never a verbal "you keep coming back" insight or
    // a question at the moment of least capacity. After 22:00 the practices are
    // hour-gated off anyway, so this is what a strong bedtime pull normally
    // gets. A repeated strong pull keeps getting the wordless settle rather than
    // escalating to a verbal prompt (decision 5 - "wordless at bedtime"); the
    // settle bypasses the anti-repeat, so repeating it here is fine.
    if (isBedtimeIntervention) {
      return decision(
        "WIND_DOWN_SETTLE",
        "bedtime_settle_strong",
        frictionLevel,
      );
    }

    if (patternInsight) {
      return decision(
        "PATTERN_INSIGHT",
        "strong_friction_pattern_insight",
        frictionLevel,
        patternInsight,
      );
    }

    // After the pattern insight, never instead of it: a ready insight is the
    // most context-specific thing the strong tier can say, and the bell must
    // not displace it. It only adds variety to the more generic slots below
    // (saved reason / alternative / question).
    if (canOfferBell && chance(BELL_PROBABILITY, random)) {
      return decision("BELL", "bell_strong", frictionLevel);
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

  // Bedtime settle (non-strong): the everyday bedtime interrupt is always
  // wordless. Normally the wordless moon - "let the day go" - served in place of
  // the ordinary evening options. Once the user has already wound down tonight
  // via the guided flow (see `canServeBedtimeSettle`), the settle steps aside
  // for the calm no-typing NOTICE anchor - never the same moon again (that
  // nags), and never the verbal reason/alternative/question cascade below (a
  // survey at the moment of least capacity fails the 90% bar). Returning here
  // for the whole bedtime window keeps every normal-tier bedtime interrupt
  // wordless, whichever way it resolves. Placed above the expired-intent branch
  // and the whole cascade below. Deliberately exempt from the anti-repeat: both
  // outcomes are deliberate bedtime repeats, like the hard gates, so they must
  // not be swapped out for variety.
  if (isBedtimeIntervention) {
    return canServeBedtimeSettle
      ? decision("WIND_DOWN_SETTLE", "bedtime_settle", frictionLevel)
      : decision("NOTICE", "bedtime_settled_notice", frictionLevel);
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
  // The usage observation ("You've spent about X on Y so far today.") is a
  // present-moment awareness nudge for a *real* intervention - when the user is
  // mid-doom-scroll on a site/app. Starting an intervention deliberately from
  // the dashboard isn't that moment: replaying their own day's stats back at
  // them there reads as a tracker, not a pause. Keep it to real interventions.
  if (
    !isMainView &&
    ((!hasHappenedInLastXDaysAt(ratingTS, 2, nowTS) &&
      chance(USAGE_RATING_DUE_PROBABILITY, random)) ||
      (!isSameLocalDate(ratingTS, nowTS) &&
        chance(USAGE_RATING_TODAY_PROBABILITY, random)))
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

  if (canOfferBell && chance(BELL_SAMPLE_PROBABILITY, random)) {
    return decision("BELL", "bell_sample", frictionLevel);
  }

  // Kept to real interventions like the bell: the dashboard's sun already
  // offers its own embodied rituals (drag down to ground, fling to let go).
  // Touch-primary only: it invites the scrolling *finger* to rest on a pad, an
  // embodied press-and-hold that has no meaning with a mouse.
  if (
    isTouchPrimary &&
    !isMainView &&
    chance(FINGER_REST_PROBABILITY, random)
  ) {
    return decision("FINGER_REST", "finger_rest_sample", frictionLevel);
  }

  if (chance(NOTICE_PROBABILITY, random)) {
    return decision("NOTICE", "notice_sample", frictionLevel);
  }

  // Anti-repeat: this fallback is QUESTION, and because every richer mode above
  // is low-probability, it is by far the most common outcome - so when the user
  // returns again and again in one sitting it would otherwise serve QUESTION
  // back-to-back, making the loop feel like the same screen each time. If the
  // last intervention already opened with QUESTION, offer the gentle no-typing
  // NOTICE anchor instead (it exists for exactly this "nothing more specific is
  // due" moment), so the everyday loop alternates rather than repeats. The hard
  // gates above (few answers, missing energy, strong-friction prompts) are
  // intentional repeats and are deliberately left untouched.
  if (syncData.lastInteractionMode === "QUESTION") {
    return decision("NOTICE", "fallback_anti_repeat_notice", frictionLevel);
  }

  return decision("QUESTION", "fallback_question", frictionLevel);
};

export const getInteractionMode = (
  syncData: SyncData,
  options?: InteractionModeDecisionOptions,
): InteractionMode => getInteractionModeDecision(syncData, options).mode;

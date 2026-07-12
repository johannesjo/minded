import type {
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import { getRecentSunTapTimestamps } from "@src/dataInterface/sunTapHistory";
import { getAlternativesForTarget } from "@src/shared/components/interaction/alternatives/getAlternatives";
import {
  hasActiveTimerInScope,
  hasExpiredTimerInScope,
} from "@src/util/activeTimerScope";
import { resolveNightId } from "@src/shared/components/sleepWindDown/sleepWindDown.util";

export type FrictionLevel = "soft" | "normal" | "strong";

export interface InteractionContext {
  now: number;
  dateISO: string;
  localHour: number;
  target?: SessionTarget;
  platform?: SessionPlatform;
  answerCount: number;
  hasFewAnswers: boolean;
  hasFreshEnergy: boolean;
  isEvening: boolean;
  /**
   * The sleep wind-down "night id" for right now (the ISO date the bedtime began
   * on), or null if the moment is outside the user's configured bedtime window.
   * Non-null means we are inside the bedtime window; the value doubles as the
   * once-per-night key the settle guard compares against
   * `syncData.sleepWindDownDismissedNightId`.
   */
  bedtimeNightId: string | null;
  isBedtimeWindow: boolean;
  alternativeCount: number;
  hasAlternatives: boolean;
  todayOpeningAttempts: number;
  todaySunTaps: number;
  recentSunTaps: number;
  hasActiveTimer: boolean;
  hasExpiredTimerForTarget: boolean;
  hasIntentOnExpiredTimerForTarget: boolean;
}

export interface InteractionContextInput {
  syncData: SyncData;
  now: number;
  target?: SessionTarget;
  platform?: SessionPlatform;
}

const FEW_ANSWERS_MAX = 1;
const EVENING_START_HOUR = 20;
const MANY_RECENT_SUN_TAPS_THRESHOLD = 5;
const MANY_ATTEMPTS_TODAY_THRESHOLD = 10;

const isSameDate = (leftTS: number, rightTS: number): boolean => {
  if (leftTS <= 0) return false;
  return getIsoDate(new Date(leftTS)) === getIsoDate(new Date(rightTS));
};

export const getInteractionContext = ({
  syncData,
  now,
  target,
  platform,
}: InteractionContextInput): InteractionContext => {
  const nowDate = new Date(now);
  const dateISO = getIsoDate(nowDate);
  const alternatives = getAlternativesForTarget(syncData, target, platform);
  const enabledAlternativeCount = alternatives.filter(
    (alternative) => alternative.disabledTS === undefined,
  ).length;
  const activeTimer = syncData.activeTimer;
  const canResolveTimerScope = !!target && !!platform;
  const hasExpiredTimerForTarget = canResolveTimerScope
    ? hasExpiredTimerInScope(syncData, target, platform, now)
    : false;
  const bedtimeCfg = syncData.cfg.sleepWindDown;
  const bedtimeNightId = bedtimeCfg
    ? resolveNightId(bedtimeCfg, nowDate)
    : null;

  return {
    now,
    dateISO,
    localHour: nowDate.getHours(),
    target,
    platform,
    answerCount: syncData.answers.length,
    hasFewAnswers: syncData.answers.length <= FEW_ANSWERS_MAX,
    hasFreshEnergy: isSameDate(syncData.energyLvlTS, now),
    isEvening: nowDate.getHours() >= EVENING_START_HOUR,
    bedtimeNightId,
    isBedtimeWindow: bedtimeNightId !== null,
    alternativeCount: enabledAlternativeCount,
    hasAlternatives: enabledAlternativeCount > 0,
    todayOpeningAttempts: syncData.attempts[dateISO] || 0,
    todaySunTaps: syncData.sunTaps[dateISO] || 0,
    recentSunTaps: getRecentSunTapTimestamps(
      syncData.sunTapTimestamps ?? [],
      now,
    ).length,
    hasActiveTimer: canResolveTimerScope
      ? hasActiveTimerInScope(syncData, target, platform, now)
      : !!activeTimer && activeTimer.endTS > now,
    hasExpiredTimerForTarget,
    hasIntentOnExpiredTimerForTarget:
      hasExpiredTimerForTarget && !!activeTimer?.intent,
  };
};

export const getFrictionLevel = (
  context: InteractionContext,
): FrictionLevel => {
  if (
    context.recentSunTaps >= MANY_RECENT_SUN_TAPS_THRESHOLD ||
    (context.todayOpeningAttempts >= MANY_ATTEMPTS_TODAY_THRESHOLD &&
      context.todaySunTaps > 0)
  ) {
    return "strong";
  }

  if (
    context.hasFewAnswers ||
    !context.hasFreshEnergy ||
    context.isEvening ||
    context.hasIntentOnExpiredTimerForTarget
  ) {
    return "normal";
  }

  if (context.todayOpeningAttempts <= 1 && context.todaySunTaps === 0) {
    return "soft";
  }

  return "normal";
};

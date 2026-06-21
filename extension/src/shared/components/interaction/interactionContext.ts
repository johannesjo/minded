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

export type FrictionLevel = "soft" | "normal" | "strong";

export interface InteractionBudgetContext {
  isActive: boolean;
  remainingSeconds: number;
  totalBudgetSeconds: number;
  usedSeconds: number;
  isExhausted: boolean;
}

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
  alternativeCount: number;
  hasAlternatives: boolean;
  todayOpeningAttempts: number;
  todaySunTaps: number;
  recentSunTaps: number;
  todayUsageSeconds: number;
  targetUsageSeconds: number;
  budget: InteractionBudgetContext;
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
const HIGH_USAGE_TODAY_SECONDS = 20 * 60;

const isSameDate = (leftTS: number, rightTS: number): boolean => {
  if (leftTS <= 0) return false;
  return getIsoDate(new Date(leftTS)) === getIsoDate(new Date(rightTS));
};

const getBudgetContext = (
  syncData: SyncData,
  dateISO: string,
  target: SessionTarget | undefined,
  platform: SessionPlatform | undefined,
): InteractionBudgetContext => {
  if (
    !syncData.dailyBudget ||
    target?.kind === "app" ||
    (platform !== undefined && platform !== "web")
  ) {
    return {
      isActive: false,
      remainingSeconds: 0,
      totalBudgetSeconds: 0,
      usedSeconds: 0,
      isExhausted: false,
    };
  }

  const todayUsage = syncData.dailyUsage[dateISO] || {
    totalSeconds: 0,
    perSite: {},
  };
  const host = target?.kind === "host" ? target.id : undefined;
  const siteBudgetMinutes =
    host && syncData.dailyBudget.perSiteMinutes?.[host] !== undefined
      ? syncData.dailyBudget.perSiteMinutes[host]
      : undefined;
  const totalBudgetSeconds =
    (siteBudgetMinutes ?? syncData.dailyBudget.globalMinutes) * 60;
  const usedSeconds =
    siteBudgetMinutes !== undefined && host
      ? todayUsage.perSite[host] || 0
      : todayUsage.totalSeconds;
  const remainingSeconds = Math.max(0, totalBudgetSeconds - usedSeconds);

  return {
    isActive: true,
    remainingSeconds,
    totalBudgetSeconds,
    usedSeconds,
    isExhausted: remainingSeconds === 0,
  };
};

export const getInteractionContext = ({
  syncData,
  now,
  target,
  platform,
}: InteractionContextInput): InteractionContext => {
  const nowDate = new Date(now);
  const dateISO = getIsoDate(nowDate);
  const todayUsage = syncData.dailyUsage[dateISO] || {
    totalSeconds: 0,
    perSite: {},
  };
  const targetUsageSeconds =
    target?.kind === "host" ? todayUsage.perSite[target.id] || 0 : 0;
  const alternatives = getAlternativesForTarget(syncData, target, platform);
  const enabledAlternativeCount = alternatives.filter(
    (alternative) => alternative.disabledTS === undefined,
  ).length;
  const activeTimer = syncData.activeTimer;
  const canResolveTimerScope = !!target && !!platform;
  const hasExpiredTimerForTarget = canResolveTimerScope
    ? hasExpiredTimerInScope(syncData, target, platform, now)
    : false;

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
    alternativeCount: enabledAlternativeCount,
    hasAlternatives: enabledAlternativeCount > 0,
    todayOpeningAttempts: syncData.attempts[dateISO] || 0,
    todaySunTaps: syncData.sunTaps[dateISO] || 0,
    recentSunTaps: getRecentSunTapTimestamps(
      syncData.sunTapTimestamps ?? [],
      now,
    ).length,
    todayUsageSeconds: todayUsage.totalSeconds,
    targetUsageSeconds,
    budget: getBudgetContext(syncData, dateISO, target, platform),
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
    context.budget.isExhausted ||
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

  if (
    context.todayOpeningAttempts <= 1 &&
    context.todaySunTaps === 0 &&
    context.todayUsageSeconds < HIGH_USAGE_TODAY_SECONDS
  ) {
    return "soft";
  }

  return "normal";
};

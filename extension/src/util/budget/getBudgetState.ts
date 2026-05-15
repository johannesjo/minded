import { SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";

export interface BudgetState {
  isActive: boolean;
  remainingSeconds: number;
  totalBudgetSeconds: number;
  usedSeconds: number;
  /** True if budget was just exhausted (for showing message) */
  justExhausted: boolean;
}

/**
 * Get the current budget state for a given host.
 * Calculates remaining time based on global budget and optional per-site override.
 */
export const getBudgetState = (
  syncData: SyncData,
  host?: string,
  additionalUsedSeconds = 0,
): BudgetState => {
  const noBudget: BudgetState = {
    isActive: false,
    remainingSeconds: 0,
    totalBudgetSeconds: 0,
    usedSeconds: 0,
    justExhausted: false,
  };

  if (!syncData.dailyBudget) {
    return noBudget;
  }

  const today = getIsoDate();
  const todayUsage = syncData.dailyUsage[today] || {
    totalSeconds: 0,
    perSite: {},
  };

  // Calculate budget in seconds
  let budgetMinutes = syncData.dailyBudget.globalMinutes;

  // Check for per-site override
  if (host && syncData.dailyBudget.perSiteMinutes?.[host] !== undefined) {
    budgetMinutes = syncData.dailyBudget.perSiteMinutes[host];
  }

  const totalBudgetSeconds = budgetMinutes * 60;

  // Calculate used time - use per-site if override exists, otherwise global
  let usedSeconds: number;
  if (host && syncData.dailyBudget.perSiteMinutes?.[host] !== undefined) {
    usedSeconds = todayUsage.perSite[host] || 0;
  } else {
    usedSeconds = todayUsage.totalSeconds;
  }

  const effectiveUsedSeconds =
    usedSeconds + Math.max(0, Math.floor(additionalUsedSeconds));
  const remainingSeconds = Math.max(
    0,
    totalBudgetSeconds - effectiveUsedSeconds,
  );
  const justExhausted = remainingSeconds === 0 && effectiveUsedSeconds > 0;

  return {
    isActive: true,
    remainingSeconds,
    totalBudgetSeconds,
    usedSeconds: effectiveUsedSeconds,
    justExhausted,
  };
};

/**
 * Check if budget has remaining time (shorthand helper)
 */
export const hasBudgetRemaining = (
  syncData: SyncData,
  host?: string,
): boolean => {
  const state = getBudgetState(syncData, host);
  return state.isActive && state.remainingSeconds > 0;
};

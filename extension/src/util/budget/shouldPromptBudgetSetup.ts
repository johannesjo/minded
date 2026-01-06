import { SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import { isToday } from "@src/util/isToday";

const SKIP_THRESHOLD = 5;

/**
 * Check if we should prompt the user to set up a daily budget.
 * Returns true if:
 * - User has skipped 5+ times today (sunTaps >= 5)
 * - No budget is configured yet
 * - User hasn't dismissed the prompt today
 */
export const shouldPromptBudgetSetup = (syncData: SyncData): boolean => {
  // Already has a budget configured
  if (syncData.dailyBudget) {
    return false;
  }

  // Check if user dismissed the prompt today
  if (isToday(syncData.budgetPromptDismissedTS)) {
    return false;
  }

  // Check skip count for today
  const today = getIsoDate();
  const todaySkips = syncData.sunTaps[today] || 0;

  return todaySkips >= SKIP_THRESHOLD;
};

import { SyncData } from "@src/dataInterface/syncData";
import { hasBudgetRemaining } from "@src/util/budget";
import { getHostFromUrl } from "@src/util/getHostFromUrl";

/**
 * Determines whether to show the full intervention or just the little sun.
 * Returns false (skip full intervention) if:
 * - Active session timer exists
 * - Daily budget has remaining time
 */
export const isShowFullMinder = (
  currentUrl: string,
  syncData: SyncData,
): boolean => {
  const now = Date.now();
  const activeTimer = syncData.activeTimer;

  // Active session exists and hasn't expired → show little sun (not full intervention)
  if (activeTimer && activeTimer.endTS > now) {
    return false;
  }

  // Check if daily budget has remaining time
  const host = getHostFromUrl(currentUrl);
  if (hasBudgetRemaining(syncData, host)) {
    return false;
  }

  // No active session and no budget remaining → show full intervention
  return true;
};

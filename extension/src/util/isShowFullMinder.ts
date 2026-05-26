import { SyncData } from "@src/dataInterface/syncData";
import { getBudgetState } from "@src/util/budget";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import { hasActiveWebHostTimer } from "@src/util/activeTimerScope";
import { isSessionGraceActive } from "@src/util/sessionGrace";

/**
 * Determines whether to show the full intervention or just the little sun.
 * Returns false (skip full intervention) if:
 * - Active session timer exists
 * - Session grace period still has time left
 * - Daily budget has remaining time
 */
export const isShowFullMinder = (
  currentUrl: string,
  syncData: SyncData,
  pendingBudgetUsageSeconds = 0,
  sessionDurationS = 0,
): boolean => {
  const now = Date.now();
  const host = getHostFromUrl(currentUrl);

  // Active session exists and hasn't expired → show little sun (not full intervention)
  if (hasActiveWebHostTimer(syncData, host, now)) {
    return false;
  }

  // Within per-session grace window → show little sun
  if (isSessionGraceActive(syncData, sessionDurationS)) {
    return false;
  }

  // Check if daily budget has remaining time
  const budgetState = getBudgetState(syncData, host, pendingBudgetUsageSeconds);
  if (budgetState.isActive && budgetState.remainingSeconds > 0) {
    return false;
  }

  // No active session and no budget remaining → show full intervention
  return true;
};

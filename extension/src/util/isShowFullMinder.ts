import { SyncData } from "@src/dataInterface/syncData";

/**
 * Determines whether to show the full intervention or just the little sun.
 * Simple logic: show full intervention if no active session, show little sun if session is active.
 */
export const isShowFullMinder = (
  _currentUrl: string,
  syncData: SyncData,
): boolean => {
  const now = Date.now();
  const activeTimer = syncData.activeTimer;

  // Show full intervention if no active session or session has expired
  if (!activeTimer || activeTimer.endTS <= now) {
    return true;
  }

  // Active session exists and hasn't expired → show little sun (not full intervention)
  return false;
};

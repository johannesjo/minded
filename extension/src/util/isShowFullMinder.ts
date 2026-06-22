import { SyncData } from "@src/dataInterface/syncData";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import { hasActiveWebHostTimer } from "@src/util/activeTimerScope";
import { isSessionGraceActive } from "@src/util/sessionGrace";

/**
 * Determines whether to show the full intervention or just the little sun.
 * Returns false (skip full intervention) if:
 * - Active session timer exists
 * - Session grace period still has time left
 */
export const isShowFullMinder = (
  currentUrl: string,
  syncData: SyncData,
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

  // No active session and no grace remaining → show full intervention
  return true;
};

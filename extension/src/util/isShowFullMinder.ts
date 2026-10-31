import { SyncData } from "@src/dataInterface/syncData";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import {
  getWebHostSessionTarget,
  hasActiveWebHostTimer,
  isActiveTimerInScope,
} from "@src/util/activeTimerScope";
import { isSessionGraceActive } from "@src/util/sessionGrace";
import { RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS } from "@src/util/sessionDuration";

/**
 * The time the user chose ran out while they were still on the site, and the
 * pause was waiting for the next natural break (naturalBreak.ts) when a page
 * load came first. A page load *is* a natural break, so the pause belongs
 * here - not a fresh grace. Told apart from a timer that simply lapsed after
 * the user had left by the Little Sun marking the site as used at (or after)
 * the moment the time ran out.
 */
export const isTimeUpMidSession = (
  syncData: SyncData,
  host: string,
  lastUsedTS: number | undefined,
  now: number,
): boolean => {
  const timer = syncData.activeTimer;
  if (!timer || timer.durationS < 0 || timer.endTS > now) return false;
  if (!isActiveTimerInScope(timer, getWebHostSessionTarget(host), "web")) {
    return false;
  }
  return (
    lastUsedTS !== undefined &&
    lastUsedTS >= timer.endTS &&
    now - lastUsedTS <= RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS
  );
};

/**
 * Determines whether to show the full intervention or just the little sun.
 * Returns false (skip full intervention) if:
 * - Active session timer exists
 * - Session grace period still has time left
 * ...unless the chosen time already ran out mid-session (isTimeUpMidSession).
 */
export const isShowFullMinder = (
  currentUrl: string,
  syncData: SyncData,
  sessionDurationS = 0,
  lastUsedTS?: number,
): boolean => {
  const now = Date.now();
  const host = getHostFromUrl(currentUrl);

  if (isTimeUpMidSession(syncData, host, lastUsedTS, now)) {
    return true;
  }

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

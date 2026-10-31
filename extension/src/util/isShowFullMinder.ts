import { SyncData } from "@src/dataInterface/syncData";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import { hasActiveWebHostTimer } from "@src/util/activeTimerScope";
import type { EntryForHost } from "@src/dataInterface/localData";
import { isSessionGraceActive } from "@src/util/sessionGrace";
import { RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS } from "@src/util/sessionDuration";

/**
 * The time the user chose ran out while they were on the site, and the pause
 * was still waiting for the next natural break (naturalBreak.ts) when a page
 * load came first. A page load *is* a natural break, so the pause belongs
 * here - not a fresh grace. Read from an explicit marker the Little Sun sets
 * when the countdown runs out (`pauseDueTS`), never inferred from timestamps,
 * and only while the session it belongs to is still going: a marker left by a
 * tab closed long ago means nothing now.
 */
export const isTimeUpMidSession = (
  dataForHost: Pick<EntryForHost, "lastUsedTS" | "pauseDueTS"> | undefined,
  now: number,
): boolean =>
  !!dataForHost?.pauseDueTS &&
  now - dataForHost.lastUsedTS <= RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS;

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
  dataForHost?: Pick<EntryForHost, "lastUsedTS" | "pauseDueTS">,
): boolean => {
  const now = Date.now();
  const host = getHostFromUrl(currentUrl);

  if (isTimeUpMidSession(dataForHost, now)) {
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

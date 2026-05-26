import { EntryForHost } from "@src/dataInterface/localData";

/** Treat a host as a fresh session after this long without use. */
export const RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Returns the host's session duration in seconds, treating it as 0 when the
 * gap since `lastUsedTS` exceeds the reset threshold. Used to align grace and
 * elapsed counters with the reset logic in ContentScriptMain.
 */
export const getEffectiveSessionDurationS = (
  dataForHost: EntryForHost | null | undefined,
  now: number,
): number => {
  if (!dataForHost) return 0;
  if (
    now - RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS >
    dataForHost.lastUsedTS
  ) {
    return 0;
  }
  return Math.max(0, dataForHost.sessionDurationInS ?? 0);
};

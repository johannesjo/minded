export const RECENT_SUN_TAP_WINDOW_MS = 5 * 60 * 60 * 1000;

export const getRecentSunTapTimestamps = (
  sunTapTimestamps: number[] = [],
  now: number = Date.now(),
): number[] => {
  const oldestIncludedTS = now - RECENT_SUN_TAP_WINDOW_MS;
  return sunTapTimestamps.filter((ts) => ts >= oldestIncludedTS && ts <= now);
};

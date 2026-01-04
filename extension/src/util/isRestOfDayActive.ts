import { SyncData } from "@src/dataInterface/syncData";

/**
 * Checks if "rest of day" skip mode is active.
 * When active, ALL overlays should be hidden until midnight.
 *
 * @returns true if rest-of-day is active and hasn't expired
 */
export const isRestOfDayActive = (syncData: SyncData): boolean => {
  const now = Date.now();
  const activeTimer = syncData.activeTimer;

  if (!activeTimer) return false;
  if (activeTimer.durationS !== -1) return false;
  if (activeTimer.endTS <= now) return false;

  return true;
};

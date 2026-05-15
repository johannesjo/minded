import type {
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";
import { isActiveTimerInScope } from "@src/util/activeTimerScope";

/**
 * Checks if "rest of day" skip mode is active.
 * When active, ALL overlays should be hidden until midnight.
 *
 * @returns true if rest-of-day is active and hasn't expired
 */
export const isRestOfDayActive = (
  syncData: SyncData,
  target?: SessionTarget,
  platform?: SessionPlatform,
): boolean => {
  const now = Date.now();
  const activeTimer = syncData.activeTimer;

  if (!activeTimer) return false;
  if (activeTimer.durationS !== -1) return false;
  if (activeTimer.endTS <= now) return false;
  if (
    target &&
    platform &&
    !isActiveTimerInScope(activeTimer, target, platform)
  ) {
    return false;
  }

  return true;
};

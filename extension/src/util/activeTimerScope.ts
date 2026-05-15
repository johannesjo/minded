import type {
  ActiveTimer,
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";

export const getWebHostSessionTarget = (host: string): SessionTarget => ({
  kind: "host",
  id: host,
});

export const isSameSessionTarget = (
  left: SessionTarget | undefined,
  right: SessionTarget | undefined,
): boolean =>
  !!left && !!right && left.kind === right.kind && left.id === right.id;

/**
 * Legacy timers did not store target/platform. Treat missing fields as matching
 * so existing short-lived timers keep working after an update.
 */
export const isActiveTimerInScope = (
  timer: ActiveTimer | null | undefined,
  target: SessionTarget,
  platform: SessionPlatform,
): timer is ActiveTimer => {
  if (!timer) return false;

  const targetMatches =
    !timer.target || isSameSessionTarget(timer.target, target);
  const platformMatches = !timer.platform || timer.platform === platform;

  return targetMatches && platformMatches;
};

export const getActiveTimerInScope = (
  syncData: SyncData,
  target: SessionTarget,
  platform: SessionPlatform,
  now: number = Date.now(),
): ActiveTimer | null => {
  const activeTimer = syncData.activeTimer;

  return activeTimer &&
    activeTimer.endTS > now &&
    isActiveTimerInScope(activeTimer, target, platform)
    ? activeTimer
    : null;
};

export const hasActiveTimerInScope = (
  syncData: SyncData,
  target: SessionTarget,
  platform: SessionPlatform,
  now: number = Date.now(),
): boolean => getActiveTimerInScope(syncData, target, platform, now) !== null;

export const hasExpiredTimerInScope = (
  syncData: SyncData,
  target: SessionTarget,
  platform: SessionPlatform,
  now: number = Date.now(),
): boolean => {
  const activeTimer = syncData.activeTimer;
  return (
    !!activeTimer &&
    activeTimer.endTS <= now &&
    isActiveTimerInScope(activeTimer, target, platform)
  );
};

export const getActiveWebHostTimer = (
  syncData: SyncData,
  host: string,
  now: number = Date.now(),
): ActiveTimer | null =>
  getActiveTimerInScope(syncData, getWebHostSessionTarget(host), "web", now);

export const hasActiveWebHostTimer = (
  syncData: SyncData,
  host: string,
  now: number = Date.now(),
): boolean => getActiveWebHostTimer(syncData, host, now) !== null;

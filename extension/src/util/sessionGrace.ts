import { SessionGraceCfg, SyncData } from "@src/dataInterface/syncData";

export const getSessionGraceCfg = (
  syncData: SyncData,
): SessionGraceCfg | undefined => {
  const cfg = syncData.cfg.sessionGrace;
  if (!cfg || !cfg.enabled || cfg.minutes <= 0) return undefined;
  return cfg;
};

/**
 * Returns the remaining grace seconds for the current session, or 0 if grace
 * is disabled or already exhausted. Caller is responsible for resetting
 * `sessionDurationS` when the host/app has been idle past the platform's
 * session-reset threshold.
 */
export const getSessionGraceRemainingS = (
  syncData: SyncData,
  sessionDurationS: number,
): number => {
  const cfg = getSessionGraceCfg(syncData);
  if (!cfg) return 0;
  return Math.max(0, cfg.minutes * 60 - Math.max(0, sessionDurationS));
};

export const isSessionGraceActive = (
  syncData: SyncData,
  sessionDurationS: number,
): boolean => getSessionGraceRemainingS(syncData, sessionDurationS) > 0;

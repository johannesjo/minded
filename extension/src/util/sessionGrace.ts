import { SessionGraceCfg, SyncData } from "@src/dataInterface/syncData";
import {
  isInterventionPauseActive,
  LATER_PAUSE_AFTER_S,
} from "@src/shared/components/interaction/skipCheckIn/skipCheckIn";

/**
 * The grace in effect right now. A "later" week chosen from the skip check-in
 * is, on the web, exactly a longer grace: the Little Sun rides along from the
 * first second, and the full pause arrives once the session has run that long
 * (the grace-exhausted hand-back). So it widens the grace rather than adding a
 * second mechanism; a longer grace the user set themselves still wins.
 */
export const getSessionGraceCfg = (
  syncData: SyncData,
  now: number = Date.now(),
): SessionGraceCfg | undefined => {
  const cfg = syncData.cfg.sessionGrace;
  const userGrace = cfg && cfg.enabled && cfg.minutes > 0 ? cfg : undefined;
  if (!isInterventionPauseActive(syncData, "later", now)) return userGrace;

  const laterMinutes = LATER_PAUSE_AFTER_S / 60;
  return userGrace && userGrace.minutes >= laterMinutes
    ? userGrace
    : { enabled: true, minutes: laterMinutes };
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
  now: number = Date.now(),
): number => {
  const cfg = getSessionGraceCfg(syncData, now);
  if (!cfg) return 0;
  return Math.max(0, cfg.minutes * 60 - Math.max(0, sessionDurationS));
};

export const isSessionGraceActive = (
  syncData: SyncData,
  sessionDurationS: number,
): boolean => getSessionGraceRemainingS(syncData, sessionDurationS) > 0;

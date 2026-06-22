import type { ActiveTimer, SyncData } from "@src/dataInterface/syncData";
import {
  getActiveTimerInScope,
  getWebHostSessionTarget,
  hasExpiredTimerInScope,
} from "@src/util/activeTimerScope";
import {
  getSessionGraceCfg,
  getSessionGraceRemainingS,
} from "@src/util/sessionGrace";

export type LittleSunTimerSource =
  | {
      type: "session";
      activeTimer: ActiveTimer;
    }
  | {
      type: "grace";
      remainingSeconds: number;
    }
  | {
      type: "grace-exhausted";
    }
  | {
      type: "elapsed";
      initialSeconds: number;
      shouldClearExpiredTimer: boolean;
    };

export const getLittleSunTimerSource = (
  syncData: SyncData,
  host: string,
  initialElapsedSeconds: number,
  now: number = Date.now(),
): LittleSunTimerSource => {
  const target = getWebHostSessionTarget(host);
  const activeTimer = getActiveTimerInScope(syncData, target, "web", now);

  if (activeTimer && activeTimer.durationS !== -1) {
    return {
      type: "session",
      activeTimer,
    };
  }

  const graceCfg = getSessionGraceCfg(syncData);
  const graceRemaining = getSessionGraceRemainingS(
    syncData,
    initialElapsedSeconds,
  );
  if (graceRemaining > 0) {
    return {
      type: "grace",
      remainingSeconds: graceRemaining,
    };
  }

  // Grace was configured and is now exhausted — signal intervention rather than
  // silently dropping into elapsed mode.
  if (graceCfg) {
    return { type: "grace-exhausted" };
  }

  return {
    type: "elapsed",
    initialSeconds: initialElapsedSeconds,
    shouldClearExpiredTimer: hasExpiredTimerInScope(
      syncData,
      target,
      "web",
      now,
    ),
  };
};

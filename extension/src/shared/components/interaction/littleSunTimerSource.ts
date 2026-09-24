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
  /**
   * Whether an exhausted grace may hand back to the intervention. Only a
   * Little Sun that has itself been counting a grace down should: one that
   * follows an intervention the user just passed, or one already counting up
   * when a "later" week starts in another tab, must not be sent straight back
   * into a pause - it keeps counting up instead.
   */
  canHandBackExhaustedGrace = true,
): LittleSunTimerSource => {
  const target = getWebHostSessionTarget(host);
  const activeTimer = getActiveTimerInScope(syncData, target, "web", now);

  if (activeTimer && activeTimer.durationS !== -1) {
    return {
      type: "session",
      activeTimer,
    };
  }

  const graceCfg = getSessionGraceCfg(syncData, now);
  const graceRemaining = getSessionGraceRemainingS(
    syncData,
    initialElapsedSeconds,
    now,
  );
  if (graceRemaining > 0) {
    return {
      type: "grace",
      remainingSeconds: graceRemaining,
    };
  }

  // Grace was configured and is now exhausted - signal intervention rather than
  // silently dropping into elapsed mode.
  if (graceCfg && canHandBackExhaustedGrace) {
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

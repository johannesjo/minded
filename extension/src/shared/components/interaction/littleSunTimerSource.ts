import type { ActiveTimer, SyncData } from "@src/dataInterface/syncData";
import { getBudgetState } from "@src/util/budget";
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
      type: "budget";
      remainingSeconds: number;
    }
  | {
      type: "budget-exhausted";
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
  pendingBudgetUsageSeconds = 0,
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

  const budgetState = getBudgetState(syncData, host, pendingBudgetUsageSeconds);
  if (budgetState.isActive && budgetState.remainingSeconds > 0) {
    return {
      type: "budget",
      remainingSeconds: budgetState.remainingSeconds,
    };
  }
  if (budgetState.isActive) {
    return {
      type: "budget-exhausted",
    };
  }

  // Grace was configured and is now exhausted, with no budget to fall back to —
  // signal intervention rather than silently dropping into elapsed mode.
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

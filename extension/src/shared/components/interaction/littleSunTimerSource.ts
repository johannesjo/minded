import type { ActiveTimer, SyncData } from "@src/dataInterface/syncData";
import { getBudgetState } from "@src/util/budget";
import {
  getActiveTimerInScope,
  getWebHostSessionTarget,
  hasExpiredTimerInScope,
} from "@src/util/activeTimerScope";

export type LittleSunTimerSource =
  | {
      type: "session";
      activeTimer: ActiveTimer;
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
): LittleSunTimerSource => {
  const target = getWebHostSessionTarget(host);
  const activeTimer = getActiveTimerInScope(syncData, target, "web", now);

  if (activeTimer && activeTimer.durationS !== -1) {
    return {
      type: "session",
      activeTimer,
    };
  }

  const budgetState = getBudgetState(syncData, host);
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

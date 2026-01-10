import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  loadDataForHost,
  updateHostsEntry,
  // @ts-ignore
} from "@dataInterface/localDataInterface";
import {
  getSyncData,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { isRestOfDayActive } from "@src/util/isRestOfDayActive";
import { getBudgetState, addBudgetUsage } from "@src/util/budget";
import { formatSessionTime } from "@src/util/formatTime";

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;
const BUDGET_USAGE_UPDATE_INTERVAL_S = 10; // Throttle storage writes

export const LittleSunComponent: (props: {
  teardown: () => void;
  onShowFreshInteraction: () => void;
  onTap?: () => void;
  host: string;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getRemainingSeconds, setRemainingSeconds] = createSignal<
    number | null
  >(null);
  const [getIsMoveOutOfTheWay, setIsMoveOutOfTheWay] = createSignal(false);
  const [getIsBudgetMode, setIsBudgetMode] = createSignal(false);
  const [getBudgetRemaining, setBudgetRemaining] = createSignal<number | null>(
    null,
  );

  let currentSessionInterval: number;
  let budgetUsageAccumulator = 0; // Track seconds since last storage write
  let t0: NodeJS.Timeout;

  onMount(async () => {
    const d = await loadDataForHost(props.host);
    const syncData = await getSyncData();

    // Rest-of-day mode: hide everything
    if (isRestOfDayActive(syncData)) {
      props.teardown();
      return;
    }

    const now = Date.now();

    // Check for budget mode first
    const budgetState = getBudgetState(syncData, props.host);
    if (budgetState.isActive && budgetState.remainingSeconds > 0) {
      setIsBudgetMode(true);
      startBudgetCountdown(budgetState.remainingSeconds);
      t0 = setTimeout(() => setIsMoveOutOfTheWay(true), 200);
      return;
    }

    // Check for session mode using global timer
    const activeTimer = syncData.activeTimer;

    if (activeTimer && activeTimer.endTS > now) {
      if (activeTimer.durationS === -1) {
        // For rest-of-day: show count-up timer (elapsed session time)
        initCounter(d?.sessionDurationInS ?? 0);
      } else {
        // For timed sessions: show countdown timer (time left)
        startCountdown(activeTimer.endTS);
      }
    } else {
      // No active session or session expired
      initCounter(d?.sessionDurationInS ?? 0);
      // Clear stale global timer if needed
      if (activeTimer) {
        updateSyncData({ activeTimer: null });
      }
    }

    t0 = setTimeout(() => {
      setIsMoveOutOfTheWay(true);
    }, 200);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearInterval(currentSessionInterval);

    // Save accumulated budget usage on unmount
    if (getIsBudgetMode() && budgetUsageAccumulator > 0) {
      getSyncData().then((syncData) => {
        const usageUpdate = addBudgetUsage(
          syncData,
          props.host,
          budgetUsageAccumulator,
        );
        updateSyncData(usageUpdate);
      });
    }
  });

  const initCounter = (initialValue: number) => {
    if (initialValue) {
      setSessionTime(initialValue);
    }
    if (currentSessionInterval) {
      window.clearInterval(currentSessionInterval);
    }
    currentSessionInterval = window.setInterval(() => {
      const v = getSessionTime() + 1;
      updateHostsEntry(props.host, {
        lastUsedTS: Date.now(),
        sessionDurationInS: v,
      });
      setSessionTime(v);

      if (
        v - initialValue > MIN_RE_QUESTION_ELAPSED_TIME_S &&
        v % RE_QUESTION_INTERVAL_IN_S === 0
      ) {
        props.onShowFreshInteraction();
      }
    }, 1000);
  };

  const startCountdown = (sessionEndTS: number) => {
    if (currentSessionInterval) {
      window.clearInterval(currentSessionInterval);
    }

    const tick = () => {
      const remaining = Math.max(
        Math.floor((sessionEndTS - Date.now()) / 1000),
        0,
      );
      setRemainingSeconds(remaining);

      // Keep last-used timestamp fresh
      updateHostsEntry(props.host, { lastUsedTS: Date.now() });

      if (remaining <= 0) {
        window.clearInterval(currentSessionInterval);
        // Clear session and trigger full intervention again
        updateHostsEntry(props.host, { sessionDurationInS: 0 });
        updateSyncData({ activeTimer: null });
        props.onShowFreshInteraction();
      }
    };

    tick();
    currentSessionInterval = window.setInterval(tick, 1000);
  };

  const startBudgetCountdown = (initialRemaining: number) => {
    if (currentSessionInterval) {
      window.clearInterval(currentSessionInterval);
    }

    setBudgetRemaining(initialRemaining);
    budgetUsageAccumulator = 0;

    const tick = async () => {
      const remaining = (getBudgetRemaining() ?? 0) - 1;
      setBudgetRemaining(Math.max(remaining, 0));
      budgetUsageAccumulator++;

      // Keep last-used timestamp fresh
      updateHostsEntry(props.host, { lastUsedTS: Date.now() });

      // Throttle storage writes for budget usage
      if (budgetUsageAccumulator >= BUDGET_USAGE_UPDATE_INTERVAL_S) {
        const syncData = await getSyncData();
        const usageUpdate = addBudgetUsage(
          syncData,
          props.host,
          budgetUsageAccumulator,
        );
        await updateSyncData(usageUpdate);
        budgetUsageAccumulator = 0;
      }

      if (remaining <= 0) {
        window.clearInterval(currentSessionInterval);
        // Save any remaining accumulated usage
        if (budgetUsageAccumulator > 0) {
          const syncData = await getSyncData();
          const usageUpdate = addBudgetUsage(
            syncData,
            props.host,
            budgetUsageAccumulator,
          );
          await updateSyncData(usageUpdate);
        }
        // Budget exhausted - trigger full intervention
        props.onShowFreshInteraction();
      }
    };

    currentSessionInterval = window.setInterval(tick, 1000);
  };

  const handleClick = () => {
    // End current session
    window.clearInterval(currentSessionInterval);
    updateHostsEntry(props.host, { sessionDurationInS: 0 });
    updateSyncData({ activeTimer: null });

    if (props.onTap) {
      props.onTap();
    } else {
      props.onShowFreshInteraction();
    }
  };

  const getDisplayTime = () => {
    if (getIsBudgetMode() && getBudgetRemaining() !== null) {
      return formatSessionTime(getBudgetRemaining()!);
    }
    if (getRemainingSeconds() !== null) {
      return formatSessionTime(getRemainingSeconds()!);
    }
    return formatSessionTime(getSessionTime());
  };

  return (
    <div
      id="minded-6622-little-sun"
      title={
        getIsBudgetMode() ? "Daily budget remaining" : "Tap to end session"
      }
      classList={{
        ["bottomLeft"]: true,
        ["isOutOfTheWay"]: getIsMoveOutOfTheWay(),
      }}
    >
      <div id="minded-6622-little-sun-sun-wrapper">
        <div id="minded-6622-little-sun-sun" onClick={handleClick}>
          {getDisplayTime()}
        </div>
      </div>
    </div>
  );
};

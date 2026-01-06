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

    // Check for session mode
    let sessionEnd = d?.sessionEndTS ?? null;
    let sessionLimit = d?.sessionLimitInS ?? null;

    if (syncData.activeTimer?.endTS && syncData.activeTimer.endTS > now) {
      sessionEnd = syncData.activeTimer.endTS;
      sessionLimit = syncData.activeTimer.durationS;
    }

    if (sessionEnd && sessionEnd > now) {
      if (sessionLimit === -1) {
        // For rest-of-day: show count-up timer (elapsed session time)
        initCounter(d?.sessionDurationInS ?? 0);
      } else {
        // For timed sessions: show countdown timer (time left)
        startCountdown(sessionEnd, sessionLimit);
      }
    } else {
      // No active session or session expired
      initCounter(d?.sessionDurationInS ?? 0);
      // Clear any stale timing info
      if (sessionEnd) {
        updateHostsEntry(props.host, {
          sessionEndTS: null,
          sessionLimitInS: null,
        });
      }
    }

    t0 = setTimeout(() => {
      setIsMoveOutOfTheWay(true);
    }, 200);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearInterval(currentSessionInterval);
  });

  const formatSessionTime = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
    }
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    }
    if (seconds >= 30) {
      return "" + seconds;
    }
    return "";
  };

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

  const startCountdown = (
    sessionEndTS: number,
    sessionLimitInS: number | null,
  ) => {
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
      updateHostsEntry(props.host, {
        lastUsedTS: Date.now(),
        sessionEndTS,
        sessionLimitInS,
      });

      if (remaining <= 0) {
        window.clearInterval(currentSessionInterval);
        // Clear session window and trigger full intervention again
        updateHostsEntry(props.host, {
          sessionEndTS: null,
          sessionLimitInS: null,
          sessionDurationInS: 0,
        });
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
    updateHostsEntry(props.host, {
      sessionEndTS: null,
      sessionLimitInS: null,
      sessionDurationInS: 0,
    });
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
        ["budgetMode"]: getIsBudgetMode(),
      }}
    >
      <div id="minded-6622-little-sun-sun-wrapper">
        <div id="minded-6622-little-sun-sun" onClick={handleClick}>
          {getDisplayTime()}
        </div>
        {getIsBudgetMode() && <div class="minded-6622-budget-label">today</div>}
      </div>
    </div>
  );
};

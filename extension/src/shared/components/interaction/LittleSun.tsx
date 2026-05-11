import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
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
import { DailyUsage, SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import { bro } from "@src/util/browser";

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;
const BUDGET_USAGE_UPDATE_INTERVAL_S = 10; // Throttle storage writes
const LITTLE_SUN_HINT_SEEN_KEY = "littleSunHintSeen";

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
  const [getShowHint, setShowHint] = createSignal(false);

  let currentSessionInterval: number;
  let budgetUsageAccumulator = 0; // Track seconds since last storage write
  // Cache dailyUsage so pagehide can flush without an async read — async
  // getSyncData().then(...) chains don't complete during page unload.
  let cachedDailyUsage: SyncData["dailyUsage"] = {};
  let t0: NodeJS.Timeout;
  let hintTimeout: NodeJS.Timeout | undefined;

  const maybeShowHint = async () => {
    const data = await bro.storage.local.get(LITTLE_SUN_HINT_SEEN_KEY);
    if (data[LITTLE_SUN_HINT_SEEN_KEY]) return;

    hintTimeout = setTimeout(() => {
      setShowHint(true);
      hintTimeout = setTimeout(() => setShowHint(false), 6500);
    }, 900);
  };

  const flushBudgetUsageSync = () => {
    if (!getIsBudgetMode() || budgetUsageAccumulator <= 0) return;

    const today = getIsoDate();
    const currentUsage = cachedDailyUsage[today] || {
      totalSeconds: 0,
      perSite: {},
    };
    const updatedUsage: DailyUsage = {
      totalSeconds: currentUsage.totalSeconds + budgetUsageAccumulator,
      perSite: {
        ...currentUsage.perSite,
        [props.host]:
          (currentUsage.perSite[props.host] || 0) + budgetUsageAccumulator,
      },
    };
    const updatedDailyUsage = { ...cachedDailyUsage, [today]: updatedUsage };
    cachedDailyUsage = updatedDailyUsage;
    budgetUsageAccumulator = 0;

    // Fire-and-forget: the IPC to the service worker is dispatched
    // synchronously here, so the write persists even if the returned
    // Promise never resolves because the page context is torn down.
    bro.storage.sync.set({ dailyUsage: updatedDailyUsage });
  };

  onMount(async () => {
    const d = await loadDataForHost(props.host);
    const syncData = await getSyncData();
    cachedDailyUsage = syncData.dailyUsage;

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
      window.addEventListener("pagehide", flushBudgetUsageSync);
      t0 = setTimeout(() => setIsMoveOutOfTheWay(true), 200);
      void maybeShowHint();
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
    void maybeShowHint();
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearTimeout(hintTimeout);
    window.clearInterval(currentSessionInterval);
    window.removeEventListener("pagehide", flushBudgetUsageSync);
    flushBudgetUsageSync();
  });

  const dismissHint = () => {
    setShowHint(false);
    window.clearTimeout(hintTimeout);
    bro.storage.local.set({ [LITTLE_SUN_HINT_SEEN_KEY]: true });
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
        cachedDailyUsage = usageUpdate.dailyUsage;
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
          cachedDailyUsage = usageUpdate.dailyUsage;
          await updateSyncData(usageUpdate);
          budgetUsageAccumulator = 0;
        }
        // Budget exhausted - trigger full intervention
        props.onShowFreshInteraction();
      }
    };

    currentSessionInterval = window.setInterval(tick, 1000);
  };

  const handleClick = () => {
    dismissHint();
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

  const getActionLabel = () => {
    if (getIsBudgetMode()) return "Tap to review your budget";
    if (getRemainingSeconds() !== null) return "Tap to end this session";
    if (props.onTap) return "Tap to leave this site";
    return "Tap to pause and choose again";
  };

  const getAccessibleLabel = () => {
    const timeKind = getIsBudgetMode()
      ? "budget remaining"
      : getRemainingSeconds() !== null
        ? "remaining"
        : "elapsed";
    return `${getDisplayTime()} ${timeKind}. ${getActionLabel()}.`;
  };

  return (
    <div
      id="minded-6622-little-sun"
      title={getAccessibleLabel()}
      classList={{
        ["bottomLeft"]: true,
        ["isOutOfTheWay"]: getIsMoveOutOfTheWay(),
      }}
    >
      <Show when={getShowHint()}>
        <div id="minded-6622-little-sun-hint">{getActionLabel()}</div>
      </Show>
      <div id="minded-6622-little-sun-sun-wrapper">
        <button
          id="minded-6622-little-sun-sun"
          type="button"
          aria-label={getAccessibleLabel()}
          onClick={handleClick}
          onFocus={dismissHint}
        >
          {getDisplayTime()}
        </button>
      </div>
    </div>
  );
};

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
import { addBudgetUsage } from "@src/util/budget";
import { formatSessionTime } from "@src/util/formatTime";
import { DailyUsage, SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import { bro } from "@src/util/browser";
import { getLittleSunTimerSource } from "@src/shared/components/interaction/littleSunTimerSource";
import {
  getWebHostSessionTarget,
  isActiveTimerInScope,
} from "@src/util/activeTimerScope";

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
  let isDisposed = false;
  let refreshSeq = 0;

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

  const clearScopedActiveTimer = async (expectedEndTS?: number) => {
    const syncData = await getSyncData();
    const activeTimer = syncData.activeTimer;
    if (!activeTimer) return;

    const target = getWebHostSessionTarget(props.host);
    if (
      isActiveTimerInScope(activeTimer, target, "web") &&
      (expectedEndTS === undefined || activeTimer.endTS === expectedEndTS)
    ) {
      await updateSyncData({ activeTimer: null });
    }
  };

  const applyTimerSource = (
    syncData: SyncData,
    initialSessionDurationInS: number,
  ): boolean => {
    const target = getWebHostSessionTarget(props.host);

    if (isRestOfDayActive(syncData, target, "web")) {
      props.teardown();
      return false;
    }

    const source = getLittleSunTimerSource(
      syncData,
      props.host,
      initialSessionDurationInS,
    );

    if (source.type !== "budget") {
      flushBudgetUsageSync();
    }

    if (source.type === "session") {
      setIsBudgetMode(false);
      setBudgetRemaining(null);
      startCountdown(source.activeTimer.endTS);
      return true;
    }

    if (source.type === "budget") {
      const wasBudgetMode = getIsBudgetMode();
      const unflushedUsageSeconds = wasBudgetMode ? budgetUsageAccumulator : 0;
      setIsBudgetMode(true);
      setRemainingSeconds(null);
      startBudgetCountdown(
        Math.max(source.remainingSeconds - unflushedUsageSeconds, 0),
        { resetAccumulator: !wasBudgetMode },
      );
      return true;
    }

    if (source.type === "budget-exhausted") {
      window.clearInterval(currentSessionInterval);
      props.onShowFreshInteraction();
      return true;
    }

    setIsBudgetMode(false);
    setRemainingSeconds(null);
    setBudgetRemaining(null);
    initCounter(source.initialSeconds);

    if (source.shouldClearExpiredTimer) {
      void clearScopedActiveTimer();
    }
    return true;
  };

  const refreshTimerSource = async () => {
    const seq = ++refreshSeq;
    const [d, syncData] = await Promise.all([
      loadDataForHost(props.host),
      getSyncData(),
    ]);
    if (isDisposed || seq !== refreshSeq) return;

    cachedDailyUsage = syncData.dailyUsage;
    applyTimerSource(syncData, d?.sessionDurationInS ?? getSessionTime());
  };

  const handleStorageChange = (
    changes: { [key: string]: { newValue?: unknown; oldValue?: unknown } },
    areaName: string,
  ) => {
    if (areaName !== "sync") {
      return;
    }

    if ("activeTimer" in changes) {
      const target = getWebHostSessionTarget(props.host);
      const oldTimer = changes.activeTimer.oldValue as SyncData["activeTimer"];
      const newTimer = changes.activeTimer.newValue as SyncData["activeTimer"];
      if (
        !isActiveTimerInScope(oldTimer, target, "web") &&
        !isActiveTimerInScope(newTimer, target, "web")
      ) {
        return;
      }
    } else if (!("dailyBudget" in changes) && !("dailyUsage" in changes)) {
      return;
    }

    void refreshTimerSource();
  };

  onMount(async () => {
    const d = await loadDataForHost(props.host);
    const syncData = await getSyncData();
    if (isDisposed) return;

    cachedDailyUsage = syncData.dailyUsage;
    if (!applyTimerSource(syncData, d?.sessionDurationInS ?? 0)) {
      return;
    }

    t0 = setTimeout(() => {
      setIsMoveOutOfTheWay(true);
    }, 200);
    void maybeShowHint();
    bro.storage.onChanged.addListener(handleStorageChange);
    window.addEventListener("pagehide", flushBudgetUsageSync);
  });

  onCleanup(() => {
    isDisposed = true;
    window.clearTimeout(t0);
    window.clearTimeout(hintTimeout);
    window.clearInterval(currentSessionInterval);
    bro.storage.onChanged.removeListener(handleStorageChange);
    window.removeEventListener("pagehide", flushBudgetUsageSync);
    flushBudgetUsageSync();
  });

  const dismissHint = () => {
    setShowHint(false);
    window.clearTimeout(hintTimeout);
    bro.storage.local.set({ [LITTLE_SUN_HINT_SEEN_KEY]: true });
  };

  const initCounter = (initialValue: number) => {
    setSessionTime(initialValue);
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
        void clearScopedActiveTimer(sessionEndTS);
        props.onShowFreshInteraction();
      }
    };

    tick();
    currentSessionInterval = window.setInterval(tick, 1000);
  };

  const startBudgetCountdown = (
    initialRemaining: number,
    options: { resetAccumulator: boolean } = { resetAccumulator: true },
  ) => {
    if (currentSessionInterval) {
      window.clearInterval(currentSessionInterval);
    }

    setBudgetRemaining(initialRemaining);
    if (options.resetAccumulator) {
      budgetUsageAccumulator = 0;
    }

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
    void clearScopedActiveTimer();

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

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
import { formatSessionTime } from "@src/util/formatTime";
import { SyncData } from "@src/dataInterface/syncData";
import { bro } from "@src/util/browser";
import { getLittleSunTimerSource } from "@src/shared/components/interaction/littleSunTimerSource";
import {
  getWebHostSessionTarget,
  isActiveTimerInScope,
} from "@src/util/activeTimerScope";

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;
const LITTLE_SUN_HINT_SEEN_KEY = "littleSunHintSeen";

const isSessionGraceCfgChanged = (changes: {
  [key: string]: { newValue?: unknown; oldValue?: unknown };
}): boolean => {
  if (!("cfg" in changes)) return false;
  const oldCfg = changes.cfg.oldValue as SyncData["cfg"] | undefined;
  const newCfg = changes.cfg.newValue as SyncData["cfg"] | undefined;
  return (
    JSON.stringify(oldCfg?.sessionGrace) !==
    JSON.stringify(newCfg?.sessionGrace)
  );
};

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
  const [getIsGraceMode, setIsGraceMode] = createSignal(false);
  const [getGraceRemaining, setGraceRemaining] = createSignal<number | null>(
    null,
  );
  const [getShowHint, setShowHint] = createSignal(false);

  let currentSessionInterval: number;
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
      Date.now(),
    );

    if (source.type === "session") {
      setIsGraceMode(false);
      setGraceRemaining(null);
      startCountdown(source.activeTimer.endTS);
      return true;
    }

    if (source.type === "grace") {
      setIsGraceMode(true);
      setRemainingSeconds(null);
      startGraceCountdown(source.remainingSeconds, initialSessionDurationInS);
      return true;
    }

    if (source.type === "grace-exhausted") {
      window.clearInterval(currentSessionInterval);
      props.onShowFreshInteraction();
      return true;
    }

    setRemainingSeconds(null);
    setIsGraceMode(false);
    setGraceRemaining(null);
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
    } else if (!isSessionGraceCfgChanged(changes)) {
      return;
    }

    void refreshTimerSource();
  };

  onMount(async () => {
    const [d, syncData] = await Promise.all([
      loadDataForHost(props.host),
      getSyncData(),
    ]);
    if (isDisposed) return;

    if (!applyTimerSource(syncData, d?.sessionDurationInS ?? 0)) {
      return;
    }

    void maybeShowHint();
    bro.storage.onChanged.addListener(handleStorageChange);
  });

  onCleanup(() => {
    isDisposed = true;
    window.clearTimeout(hintTimeout);
    window.clearInterval(currentSessionInterval);
    bro.storage.onChanged.removeListener(handleStorageChange);
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

  const startGraceCountdown = (
    initialRemaining: number,
    initialSessionDurationS: number,
  ) => {
    if (currentSessionInterval) {
      window.clearInterval(currentSessionInterval);
    }

    setGraceRemaining(initialRemaining);
    setSessionTime(initialSessionDurationS);

    const tick = () => {
      const nextSession = getSessionTime() + 1;
      setSessionTime(nextSession);
      updateHostsEntry(props.host, {
        lastUsedTS: Date.now(),
        sessionDurationInS: nextSession,
      });

      const nextRemaining = Math.max((getGraceRemaining() ?? 0) - 1, 0);
      setGraceRemaining(nextRemaining);

      if (nextRemaining <= 0) {
        window.clearInterval(currentSessionInterval);
        // Grace exhausted — fall through to full intervention.
        void refreshTimerSource();
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
    // During grace, count the elapsed session time *up* — a calm companion
    // resting in the corner, not a countdown ticking down toward the next
    // intervention (which would manufacture the very urgency we avoid).
    if (getIsGraceMode()) {
      return formatSessionTime(getSessionTime());
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
    // Grace counts up like a plain elapsed session, so it reads as "elapsed".
    const timeKind = getRemainingSeconds() !== null ? "remaining" : "elapsed";
    return `${getDisplayTime()} ${timeKind}. ${getActionLabel()}.`;
  };

  return (
    <div
      id="minded-6622-little-sun"
      title={getAccessibleLabel()}
      // Always at the corner: it appears in place (the interaction sun glides
      // here as it departs and hands off), so no reveal animation or
      // center → corner crawl.
      classList={{
        ["bottomLeft"]: true,
        ["isOutOfTheWay"]: true,
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
          <span id="minded-6622-little-sun-time">{getDisplayTime()}</span>
        </button>
      </div>
    </div>
  );
};

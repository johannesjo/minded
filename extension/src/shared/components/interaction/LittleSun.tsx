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
import { isInterventionPauseActive } from "@src/shared/components/interaction/skipCheckIn/skipCheckIn";
import { getEffectiveSessionDurationS } from "@src/util/sessionDuration";
import { formatSessionTime } from "@src/util/formatTime";
import { SyncData } from "@src/dataInterface/syncData";
import { bro } from "@src/util/browser";
import { getLittleSunTimerSource } from "@src/shared/components/interaction/littleSunTimerSource";
import { waitForNaturalBreak } from "@src/shared/components/interaction/naturalBreak";
import { isTimeUpMidSession } from "@src/util/isShowFullMinder";
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
  // Re-show the full intervention. `morphFromCorner` is true only when the
  // session genuinely ran out (countdown hit zero, or grace exhausted) - then the
  // sun arrives by gliding out of this Little Sun's corner. It's false for the
  // periodic re-question (the session is still running - nothing "returned") and
  // for a deliberate tap, which aren't "the timer ran out" moments.
  onShowFreshInteraction: (morphFromCorner: boolean) => void;
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
  // The hint eases out before it unmounts (it used to cut out mid-glance).
  const HINT_OUT_MS = 300;
  const [getIsHintLeaving, setIsHintLeaving] = createSignal(false);
  let hintOutTimeout: number | undefined;
  const hideHint = () => {
    if (!getShowHint() || getIsHintLeaving()) return;
    setIsHintLeaving(true);
    hintOutTimeout = window.setTimeout(() => {
      setShowHint(false);
      setIsHintLeaving(false);
    }, HINT_OUT_MS);
  };

  let currentSessionInterval: number;
  let hintTimeout: NodeJS.Timeout | undefined;
  let isDisposed = false;
  let refreshSeq = 0;
  // Set once this sun counts a grace down; only then may an exhausted grace
  // hand back to the intervention (see getLittleSunTimerSource).
  let hasCountedGrace = false;
  // Set while a mid-session hand-back waits for the next natural break.
  let cancelPendingArrival: (() => void) | undefined;
  // Its own handle, so nothing that (re)starts the session counter can orphan
  // it: cleared on arrival, on cancel and on cleanup.
  let waitKeepAliveInterval: number | undefined;
  // Set the moment this sun's countdown runs out, so the clean-up that follows
  // (the timer clearing, read back through storage) can't call the wait off
  // before the stored marker is visible.
  let hasPauseDue = false;

  const consumePauseDue = () => {
    hasPauseDue = false;
    void updateHostsEntry(props.host, { pauseDueTS: 0 });
  };

  /**
   * Every *automatic* return of the full pause mid-session - grace used up, a
   * chosen time run out, the periodic re-question - waits for the next natural
   * break (see naturalBreak.ts) instead of cutting in mid-sentence or
   * mid-video. A deliberate tap never waits. `beforeArrive` runs at the break,
   * so whatever the arrival changes (clearing the timer) changes only then.
   */
  const arriveAtNaturalBreak = (
    morphFromCorner: boolean,
    beforeArrive?: () => void,
  ) => {
    if (cancelPendingArrival) return;
    window.clearInterval(currentSessionInterval);
    keepSessionAliveWhileWaiting();
    cancelPendingArrival = waitForNaturalBreak(() => {
      cancelPendingArrival = undefined;
      stopKeepAlive();
      if (isDisposed) return;
      beforeArrive?.();
      props.onShowFreshInteraction(morphFromCorner);
    });
  };

  // While the pause waits, the user is still here: keep the session warm (so a
  // page load in the meantime still reads as the same session) and let the
  // sun keep counting up - except a run-out countdown, which rests at 0:00.
  // Never from a hidden tab: a background tab left waiting must not keep the
  // site's session warm for days, so every later visit would skip its grace.
  const stopKeepAlive = () => {
    window.clearInterval(waitKeepAliveInterval);
    waitKeepAliveInterval = undefined;
  };

  const keepSessionAliveWhileWaiting = () => {
    stopKeepAlive();
    waitKeepAliveInterval = window.setInterval(() => {
      if (document.hidden) return;
      if (getRemainingSeconds() !== null) {
        updateHostsEntry(props.host, { lastUsedTS: Date.now() });
        return;
      }
      const v = getSessionTime() + 1;
      setSessionTime(v);
      updateHostsEntry(props.host, {
        lastUsedTS: Date.now(),
        sessionDurationInS: v,
      });
    }, 1000);
  };

  const cancelArrival = () => {
    cancelPendingArrival?.();
    cancelPendingArrival = undefined;
    stopKeepAlive();
  };

  const maybeShowHint = async () => {
    const data = await bro.storage.local.get(LITTLE_SUN_HINT_SEEN_KEY);
    if (data[LITTLE_SUN_HINT_SEEN_KEY]) return;

    hintTimeout = setTimeout(() => {
      setShowHint(true);
      hintTimeout = setTimeout(hideHint, 6500);
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
    // A chosen time ran out here and its pause still waits for the break.
    isPauseDue = false,
  ): boolean => {
    const target = getWebHostSessionTarget(props.host);

    if (
      isRestOfDayActive(syncData, target, "web") ||
      isInterventionPauseActive(syncData, "off", Date.now())
    ) {
      props.teardown();
      return false;
    }

    const source = getLittleSunTimerSource(
      syncData,
      props.host,
      initialSessionDurationInS,
      Date.now(),
      hasCountedGrace,
    );

    if (source.type === "session") {
      hasPauseDue = false;
    } else if (isPauseDue || hasPauseDue) {
      // Already waiting: the run-out time's own clean-up (clearing the timer)
      // must not call the pause off.
      setIsGraceMode(false);
      setRemainingSeconds(0);
      arriveAtNaturalBreak(true, consumePauseDue);
      return true;
    }

    if (source.type !== "grace-exhausted") {
      // A new timer or grace (set in another tab, a settings change) means
      // nothing is due any more.
      cancelArrival();
    }

    if (source.type === "session") {
      setIsGraceMode(false);
      setGraceRemaining(null);
      startCountdown(source.activeTimer.endTS);
      return true;
    }

    if (source.type === "grace") {
      hasCountedGrace = true;
      setIsGraceMode(true);
      setRemainingSeconds(null);
      startGraceCountdown(source.remainingSeconds, initialSessionDurationInS);
      return true;
    }

    if (source.type === "grace-exhausted") {
      // Grace ran out after a real session - a genuine "timer ran out", so morph
      // - at the next natural break.
      arriveAtNaturalBreak(true);
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

    applyTimerSource(
      syncData,
      d ? getEffectiveSessionDurationS(d, Date.now()) : getSessionTime(),
      isTimeUpMidSession(d, Date.now()),
    );
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
    } else if (
      !isSessionGraceCfgChanged(changes) &&
      // A chosen week starting or ending changes the grace in effect.
      !("interventionPause" in changes)
    ) {
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

    // Effective, not raw: a session idle past the reset threshold starts from
    // 0 here exactly as the content script counted it (its own reset write
    // lands after this read), or a stale count would cut the grace short.
    if (
      !applyTimerSource(
        syncData,
        getEffectiveSessionDurationS(d, Date.now()),
        isTimeUpMidSession(d, Date.now()),
      )
    ) {
      return;
    }

    void maybeShowHint();
    bro.storage.onChanged.addListener(handleStorageChange);
  });

  onCleanup(() => {
    isDisposed = true;
    window.clearTimeout(hintTimeout);
    window.clearTimeout(hintOutTimeout);
    window.clearInterval(currentSessionInterval);
    cancelArrival();
    bro.storage.onChanged.removeListener(handleStorageChange);
  });

  const dismissHint = () => {
    hideHint();
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
        // Periodic re-question mid-session: the session is still running, so this
        // isn't a "timer ran out" return - don't morph from the corner.
        arriveAtNaturalBreak(false);
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
        // The countdown ran out: the session ends and the timer is cleared
        // now, as ever, and the pause is marked due (a page load before the
        // break meets it - isTimeUpMidSession). It morphs back out of the
        // corner (the headline reverse-morph case) at the next natural break.
        hasPauseDue = true;
        void updateHostsEntry(props.host, {
          lastUsedTS: Date.now(),
          sessionDurationInS: 0,
          pauseDueTS: Date.now(),
        }).then(() => clearScopedActiveTimer(sessionEndTS));
        arriveAtNaturalBreak(true, consumePauseDue);
      }
    };

    // Assigned before the first tick: a countdown that is already up must not
    // have its waiting replaced by a fresh interval right after.
    currentSessionInterval = window.setInterval(tick, 1000);
    tick();
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
        // Grace exhausted - fall through to full intervention.
        void refreshTimerSource();
      }
    };

    currentSessionInterval = window.setInterval(tick, 1000);
  };

  const handleClick = () => {
    dismissHint();
    cancelArrival();
    // End current session
    window.clearInterval(currentSessionInterval);
    updateHostsEntry(props.host, { sessionDurationInS: 0 });
    void clearScopedActiveTimer();

    if (props.onTap) {
      props.onTap();
    } else {
      // A deliberate tap to choose again - the user ended it, the timer didn't
      // run out - so re-show without the corner morph.
      props.onShowFreshInteraction(false);
    }
  };

  const getDisplayTime = () => {
    // During grace, count the elapsed session time *up* - a calm companion
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
        <div
          id="minded-6622-little-sun-hint"
          classList={{ isLeaving: getIsHintLeaving() }}
        >
          {getActionLabel()}
        </div>
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

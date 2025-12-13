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

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;

export const LittleSunComponent: (props: {
  teardown: () => void;
  onShowFreshInteraction: () => void;
  host: string;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getRemainingSeconds, setRemainingSeconds] = createSignal<
    number | null
  >(null);
  const [getIsMoveOutOfTheWay, setIsMoveOutOfTheWay] = createSignal(false);

  let currentSessionInterval: number;
  let t0: NodeJS.Timeout;

  onMount(async () => {
    const d = await loadDataForHost(props.host);
    const syncData = await getSyncData();

    const now = Date.now();
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

  const handleClick = () => {
    // End current session and show intervention
    window.clearInterval(currentSessionInterval);
    updateHostsEntry(props.host, {
      sessionEndTS: null,
      sessionLimitInS: null,
      sessionDurationInS: 0,
    });
    updateSyncData({ activeTimer: null });
    props.onShowFreshInteraction();
  };

  return (
    <div
      id="minded-6622-little-sun"
      title="Tap to end session"
      classList={{
        ["bottomLeft"]: true,
        ["isOutOfTheWay"]: getIsMoveOutOfTheWay(),
      }}
    >
      <div id="minded-6622-little-sun-sun-wrapper">
        <div id="minded-6622-little-sun-sun" onClick={handleClick}>
          {getRemainingSeconds() !== null
            ? formatSessionTime(getRemainingSeconds()!)
            : formatSessionTime(getSessionTime())}
        </div>
      </div>
    </div>
  );
};

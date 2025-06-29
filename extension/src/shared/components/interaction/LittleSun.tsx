import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  loadDataForHost,
  updateHostsEntry,
  // @ts-ignore
} from "@dataInterface/localDataInterface";
// Removed closeTab import as it's no longer needed

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;
// const RE_QUESTION_INTERVAL_IN_S = 8;

export const LittleSunComponent: (props: {
  teardown: () => void;
  onShowFreshInteraction: () => void;
  host: string;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getIsMoveOutOfTheWay, setIsMoveOutOfTheWay] = createSignal(false);
  const [getIsScalingOut, setIsScalingOut] = createSignal(false);

  let currentSessionInterval: number;
  let t0: NodeJS.Timeout;
  let sunEl: HTMLDivElement = undefined!;

  onMount(async () => {
    const d = await loadDataForHost(props.host);

    initCounter(d?.sessionDurationInS ?? 0);

    // FOR TESTING
    // setTimeout(() => {
    //   props.onShowFreshInteraction();
    // }, 8000);

    t0 = setTimeout(() => {
      setIsMoveOutOfTheWay(true);
    }, 200);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearInterval(currentSessionInterval);
  });

  const formatSessionTime = (seconds: number): string => {
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

  const handleDoubleClick = () => {
    setIsScalingOut(true);
    // Wait for animation to complete before tearing down
    sunEl.addEventListener(
      "animationend",
      () => {
        props.teardown();
      },
      { once: true },
    );
  };

  return (
    <div
      id="minded-6622-little-sun"
      title="Double-click to hide"
      ref={sunEl}
      classList={{
        ["bottomLeft"]: true,
        ["isOutOfTheWay"]: getIsMoveOutOfTheWay(),
        ["scaling-out"]: getIsScalingOut(),
      }}
    >
      <div id="minded-6622-little-sun-sun-wrapper">
        <div id="minded-6622-little-sun-sun" onDblClick={handleDoubleClick}>
          {formatSessionTime(getSessionTime())}
        </div>
      </div>
    </div>
  );
};

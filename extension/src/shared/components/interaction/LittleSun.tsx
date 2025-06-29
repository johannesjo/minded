import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  loadDataForHost,
  updateHostsEntry,
  // @ts-ignore
} from "@dataInterface/localDataInterface";
import { closeTab } from "@src/dataInterface/extension/extensionApi";

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;
// const RE_QUESTION_INTERVAL_IN_S = 8;

export const LittleSunComponent: (props: {
  bubbleTxt?: string;
  wasAnswerGiven: boolean;
  teardown: () => void;
  onShowQuestionAgain: () => void;
  onShowFreshInteraction: () => void;
  host: string;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getIsLittleSunSuccess, setIsLittleSunSuccess] = createSignal(false);
  const [getIsMoveOutOfTheWay, setIsMoveOutOfTheWay] = createSignal(false);
  const [getIsShowBubbleTxt, setIsShowBubbleTxt] = createSignal(false);

  let currentSessionInterval: number;
  let littleSunSuccessSunEl: HTMLDivElement = undefined!;
  let t0: NodeJS.Timeout;
  let t1: NodeJS.Timeout;

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

    t1 = setTimeout(() => {
      setIsShowBubbleTxt(true);
    }, 1200);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearTimeout(t1);
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

  const littleSunClose = () => {
    setIsLittleSunSuccess(true);
    littleSunSuccessSunEl.addEventListener("animationend", () => {
      closeTab();
    });
  };

  return (
    <>
      {getIsLittleSunSuccess() ? (
        <div
          id="minded-6622-little-sun-success-sun"
          ref={littleSunSuccessSunEl}
        >
          <div></div>
          <div>That is a good decision!</div>
        </div>
      ) : (
        <div
          id="minded-6622-little-sun"
          classList={{
            ["topRight"]: true,
            ["isOutOfTheWay"]: getIsMoveOutOfTheWay(),
          }}
        >
          {props.bubbleTxt && getIsShowBubbleTxt() && (
            <div
              id="minded-6622-little-sun-text"
              title={props.wasAnswerGiven ? "Close website" : "Click to answer"}
              onclick={() => {
                if (props.wasAnswerGiven) {
                  littleSunClose();
                } else {
                  props.onShowQuestionAgain();
                }
              }}
              classList={{
                ["was-NO-answer-given"]: !props.wasAnswerGiven,
                ["long-text"]: props.bubbleTxt?.length > 144,
                ["very-long-text"]: props.bubbleTxt?.length > 288,
              }}
            >
              {props.bubbleTxt}
            </div>
          )}

          <div id="minded-6622-little-sun-sun-wrapper">
            <div
              id="minded-6622-little-sun-sun"
              title="Close website"
              onClick={() => littleSunClose()}
            >
              {formatSessionTime(getSessionTime())}
            </div>
          </div>

          <div id="minded-6622-additional-controls">
            <div title="Hide sun" onClick={() => props.teardown()}>
              ✕
            </div>
          </div>
        </div>
      )}
    </>
  );
};

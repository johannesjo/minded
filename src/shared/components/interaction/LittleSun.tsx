import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { bro } from "@src/util/browser";
import {
  loadDataForHost,
  updateHostsEntry,
} from "@src/shared/data/localDataInterface";

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
const MIN_RE_QUESTION_ELAPSED_TIME_S = 5 * 60;
// const RE_QUESTION_INTERVAL_IN_S = 8;

export const LittleSunComponent: (props: {
  mode: "RATING" | "ACTION_ADVICE" | "QUESTION" | "SINGLE_SUN";
  bubbleTxt?: string;
  wasAnswerGiven: boolean;
  teardown: () => void;
  onShowQuestionAgain: () => void;
  onShowFreshQuestion: () => void;
  host: string;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getIsLittleSunSuccess, setIsLittleSunSuccess] = createSignal(false);
  const [getIsMoveToTopRight, setIsMoveToTopRight] = createSignal(false);
  const [getIsShowBubbleTxt, setIsShowBubbleTxt] = createSignal(false);

  let currentSessionInterval: number;
  let littleSunSuccessSunEl;
  let t0;
  let t1;

  onMount(async () => {
    const d = await loadDataForHost(props.host);

    initCounter(d?.sessionDurationInS ?? 0);

    t0 = setTimeout(() => {
      setIsMoveToTopRight(true);
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
      console.log(
        `${v % RE_QUESTION_INTERVAL_IN_S === 0}: ${v} % ${RE_QUESTION_INTERVAL_IN_S} === 0`,
        `||||| ${v - initialValue > MIN_RE_QUESTION_ELAPSED_TIME_S}: ${v} - ${initialValue} > ${MIN_RE_QUESTION_ELAPSED_TIME_S}`,
      );

      if (
        v - initialValue > MIN_RE_QUESTION_ELAPSED_TIME_S &&
        v % RE_QUESTION_INTERVAL_IN_S === 0
      ) {
        props.onShowFreshQuestion();
      }
    }, 1000);
  };

  const littleSunClose = () => {
    setIsLittleSunSuccess(true);
    littleSunSuccessSunEl.addEventListener("animationend", () => {
      bro.runtime.sendMessage({ closeTab: true });
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
            ["minded-6622-top-right"]: getIsMoveToTopRight(),
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
                ["minded-6622-was-NO-answer-given"]: !props.wasAnswerGiven,
                ["minded-6622-long-text"]: props.bubbleTxt?.length > 144,
                ["minded-6622-very-long-text"]: props.bubbleTxt?.length > 288,
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

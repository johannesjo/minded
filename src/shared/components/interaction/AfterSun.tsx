import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { bro } from "@src/util/browser";
import {
  loadDataForHost,
  updateHostsEntry,
} from "@src/shared/data/localDataInterface";

const RE_QUESTION_INTERVAL_IN_S = 15 * 60;
// const RE_QUESTION_INTERVAL_IN_S = 8;

export const AfterSunComponent: (props: {
  mode: "RATING" | "ACTION_ADVICE" | "QUESTION" | "SINGLE_SUN";
  bubbleTxt?: string;
  wasAnswerGiven: boolean;
  teardown: () => void;
  onShowQuestionAgain: () => void;
  onShowFreshQuestion: () => void;
  onChangeQuestion: () => void;
  host: string;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getIsAfterSunSuccess, setIsAfterSunSuccess] = createSignal(false);
  const [getIsMoveToTopRight, setIsMoveToTopRight] = createSignal(false);
  const [getIsShowBubbleTxt, setIsShowBubbleTxt] = createSignal(false);

  let currentSessionInterval: number;
  let afterSunSuccessSunEl;
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
      console.log(v % RE_QUESTION_INTERVAL_IN_S);

      if (v > 0 && v % RE_QUESTION_INTERVAL_IN_S === 0) {
        props.onShowFreshQuestion();
      }
    }, 1000);
  };

  const afterSunClose = () => {
    setIsAfterSunSuccess(true);
    afterSunSuccessSunEl.addEventListener("animationend", () => {
      bro.runtime.sendMessage({ closeTab: true });
    });
  };

  return (
    <>
      {getIsAfterSunSuccess() ? (
        <div id="minded-6622-after-sun-success-sun" ref={afterSunSuccessSunEl}>
          <div></div>
          <div>That is a good decision!</div>
        </div>
      ) : (
        <div
          id="minded-6622-after-sun"
          classList={{
            ["minded-6622-top-right"]: getIsMoveToTopRight(),
          }}
        >
          {props.bubbleTxt && getIsShowBubbleTxt() && (
            <div
              id="minded-6622-after-sun-text"
              title={props.wasAnswerGiven ? "Close website" : "Click to answer"}
              onclick={() => {
                if (props.wasAnswerGiven) {
                  afterSunClose();
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

          <div id="minded-6622-after-sun-sun-wrapper">
            <div
              id="minded-6622-after-sun-sun"
              title="Close website"
              onClick={() => afterSunClose()}
            >
              {formatSessionTime(getSessionTime())}
            </div>
          </div>

          <div id="minded-6622-additional-controls">
            {props.mode === "QUESTION" && (
              <div
                title="Change question"
                onClick={() => props.onChangeQuestion()}
              >
                ⇅
              </div>
            )}
            <div title="Hide sun" onClick={() => props.teardown()}>
              ✕
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import { createSignal, JSX, onMount } from "solid-js";
import { bro } from "@src/util/browser";

export const AfterSunComponent: (props: {
  mode: "RATING" | "ACTION_ADVICE" | "QUESTION";
  bubbleTxt?: string;
  wasAnswerGiven: boolean;
  teardown: () => void;
  onShowQuestionAgain: () => void;
  onChangeQuestion: () => void;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getIsAfterSunSuccess, setIsAfterSunSuccess] = createSignal(false);
  const [getIsMoveToTopRight, setIsMoveToTopRight] = createSignal(false);
  const [getIsShowBubbleTxt, setIsShowBubbleTxt] = createSignal(false);

  let currentSessionInterval: number;
  let afterSunSuccessSunEl;

  onMount(async () => {
    initCounter();
    setTimeout(() => {
      setIsMoveToTopRight(true);
    }, 200);

    setTimeout(() => {
      setIsShowBubbleTxt(true);
    }, 1200);
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

  const initCounter = () => {
    if (currentSessionInterval) {
      window.clearInterval(currentSessionInterval);
    }
    currentSessionInterval = window.setInterval(() => {
      const v = getSessionTime();
      setSessionTime(v + 1);
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
          <div>Welcome back!</div>
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

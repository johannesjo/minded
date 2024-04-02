import { createSignal, JSX, onMount } from "solid-js";
import { bro } from "@src/util/browser";

export const AfterSunComponent: (props: {
  bubbleTxt?: string;
  teardown: () => void;
}) => JSX.Element = (props) => {
  const [getSessionTime, setSessionTime] = createSignal<number>(0);
  const [getIsAfterSunSuccess, setIsAfterSunSuccess] = createSignal(false);
  const [getIsMoveToTopRight, setIsMoveToTopRight] = createSignal(false);

  let currentSessionInterval: number;
  let afterSunSuccessSunEl;

  onMount(async () => {
    initCounter();
    setTimeout(() => {
      setIsMoveToTopRight(true);
    }, 200);
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

  const afterSunClose = async () => {
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
            ["minded-6622-bottom"]: !!props.bubbleTxt,
            ["minded-6622-top-right"]: getIsMoveToTopRight(),
          }}
        >
          <div id="minded-6622-after-sun-sun-wrapper">
            <div
              id="minded-6622-after-sun-sun"
              title="Close website"
              onclick={() => afterSunClose()}
            >
              {formatSessionTime(getSessionTime())}
            </div>
          </div>

          {props.bubbleTxt && (
            <div id="minded-6622-after-sun-text">{props.bubbleTxt}</div>
          )}

          <div id="minded-6622-additional-controls">
            <div title="Hide sun" onclick={() => props.teardown()}>
              ✕
            </div>
          </div>
        </div>
      )}
    </>
  );
};

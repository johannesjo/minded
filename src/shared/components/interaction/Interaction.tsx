/* @refresh reload */
import { createSignal, JSX, Match, onCleanup, onMount, Switch } from "solid-js";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { getRndInt } from "@src/util/getRndInt";
import { RatingInteraction } from "@src/shared/components/interaction/RatingInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { bro } from "@src/util/browser";
import { Answer } from "@src/shared/data/sync-data";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
} from "@src/shared/data/questions";

const MODE: "RATING" | "PURPOSE" | "ACTION_ADVICE" | undefined = (() => {
  const rndInt = getRndInt(0, 100);
  if (rndInt >= 95) {
    return "PURPOSE";
  }
  if (rndInt >= 90) {
    return "RATING";
  }
  if (rndInt >= 75) {
    return "ACTION_ADVICE";
  }
  return undefined;
})();
const ADVICE = getRndEntry(ACTION_ADVICES);
const SUN_ANI_DURATION = 1600;

export const Interaction: (props: { onHideAll: () => void }) => JSX.Element = (
  props,
) => {
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getIsAfterSunSuccess, setIsAfterSunSuccess] = createSignal(false);
  const [getIsShowAfterSun, setIsShowAfterSun] = createSignal(false);
  const [getIsShowInteractionBox, setIsShowInteractionBox] = createSignal(true);
  const [getAfterSunTxt, setAfterSunTxt] = createSignal<string>("");
  const [getSessionTime, setSessionTime] = createSignal<number>(0);

  let questionWrapperEl;
  let afterSunEl;
  let successSunEl;
  let frameNr;
  let currentSessionInterval;

  onMount(async () => {
    // give a moment time for rendering
    setTimeout(() => {
      stopAllVideos();
    }, 1000);
    // NOTE: timeout makes this much more reliable
    setTimeout(() => {
      initFadeOut();
    }, 100);
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  const initFadeOut = () => {
    if (MODE === "ACTION_ADVICE") {
      const res = fadeOut(questionWrapperEl, 4000, 3000);
      frameNr = res.frameNr;
      res.promise.then(() => {
        if (questionWrapperEl.style.opacity < 0.1) {
          afterSun();
        }
      });
      setTimeout(() => {
        setIsShowSuccessSun(true);
      }, 3000);
    } else {
      const res = fadeOut(questionWrapperEl, 5000, 2000);
      frameNr = res.frameNr;
      res.promise.then(() => {
        if (questionWrapperEl.style.opacity < 0.1) {
          afterSun();
        }
      });
    }
  };

  const onSuccess = async (answerOrData?: Answer) => {
    setIsShowSuccessSun(true);
    // wait for sun
    await promiseTimeout(SUN_ANI_DURATION);
    setIsShowInteractionBox(false);
    await Promise.all([
      fadeOut(questionWrapperEl, SUN_ANI_DURATION).promise,
      fadeOut(successSunEl, SUN_ANI_DURATION).promise,
    ]);
    setIsShowSuccessSun(false);
    questionWrapperEl.remove();

    if (MODE === "PURPOSE" && typeof answerOrData?.val === "string") {
      setAfterSunTxt(answerOrData.val);
      afterSun();
    } else {
      afterSun();
    }
  };

  const cancelFadeoutCountdown = () => {
    if (!frameNr) {
      return;
    }
    if (getIsShowSuccessSun()) {
      return;
    }

    window.cancelAnimationFrame(frameNr);
    if (questionWrapperEl) {
      questionWrapperEl.style.transition = `opacity 1000ms ease-out`;
      questionWrapperEl.style.opacity = "1";
    }
  };

  const afterSun = () => {
    setIsShowSuccessSun(false);
    setIsShowAfterSun(true);
    initCounter();
  };
  const afterSunClose = async () => {
    setIsShowSuccessSun(true);
    setIsAfterSunSuccess(true);
    successSunEl.addEventListener("animationend", () => {
      bro.runtime.sendMessage({ closeTab: true });
    });
  };

  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const fadeOutMainOnSkip = () => {
    if (questionWrapperEl) {
      fadeOut(questionWrapperEl, 150).promise.then(() => {
        afterSun();
      });
    } else {
      afterSun();
    }
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

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOutMainOnSkip();
    }
  };

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

  return (
    <>
      {getIsShowAfterSun() ? (
        <div
          id="minded-6622-after-sun"
          classList={{
            ["minded-6622-bottom"]: !!getAfterSunTxt(),
            ["minded-6622-top-right"]: !!getSessionTime(),
            ["minded-6622-is-after-sun-success"]: !!getIsAfterSunSuccess(),
          }}
        >
          <div id="minded-6622-after-sun-sun-wrapper">
            <div
              id="minded-6622-after-sun-sun"
              title="Close website"
              onclick={() => afterSunClose()}
              ref={afterSunEl}
            >
              {formatSessionTime(getSessionTime())}
            </div>
          </div>

          {getAfterSunTxt() && (
            <div id="minded-6622-after-sun-text">{getAfterSunTxt()}</div>
          )}

          <div id="minded-6622-additional-controls">
            <div title="Hide sun" onClick={() => teardown()}>
              ✕
            </div>
          </div>
        </div>
      ) : (
        <div
          id="minded-6622-coloured-wrapper-dynamic"
          onclick={(ev) => {
            if (
              (ev.target as HTMLElement)?.id ===
              "minded-6622-coloured-wrapper-dynamic"
            ) {
              fadeOutMainOnSkip();
            }
          }}
          ref={questionWrapperEl}
        >
          {getIsShowInteractionBox() && (
            <div id="minded-6622-box">
              <Switch>
                <Match when={(MODE === "ACTION_ADVICE") as any}>
                  <div id="minded-6622-action-advice">
                    <div>{ADVICE.txt}</div>
                    <div>{ADVICE.ico}</div>
                  </div>
                </Match>
                <Match when={(MODE === "RATING") as any}>
                  <RatingInteraction
                    onCancelCountdown={cancelFadeoutCountdown}
                    onSuccess={onSuccess}
                    onCancel={teardown}
                  />
                </Match>
                <Match when={(MODE === "PURPOSE") as any}>
                  <Question
                    question={{
                      prompt:
                        QUESTION_CATEGORIES.XPurposeOfSession
                          .specialQuestions[0].prompt,
                      t: QUESTION_CATEGORIES.XPurposeOfSession
                        .specialQuestions[0].t,
                      categoryId: QuestionCategoryId.XPurposeOfSession,
                    }}
                    isDontSave={true}
                    onCancelCountdown={cancelFadeoutCountdown}
                    onSuccess={onSuccess}
                    onCancel={teardown}
                  />
                </Match>
                <Match when={!MODE as any}>
                  <Question
                    onCancelCountdown={cancelFadeoutCountdown}
                    onSuccess={onSuccess}
                    onCancel={teardown}
                  />
                </Match>
              </Switch>
            </div>
          )}
        </div>
      )}

      {getIsShowSuccessSun() && (
        <div
          id="minded-6622-success-sun"
          title="Click sun to close website"
          ref={successSunEl}
          onclick={() => {
            bro.runtime.sendMessage({ closeTab: true });
          }}
          classList={{
            ["minded-6622-is-after-sun-success"]: !!getIsAfterSunSuccess(),
          }}
        >
          <div></div>
          <div>
            {!getIsAfterSunSuccess() && "click sun to close the website"}
          </div>
        </div>
      )}
    </>
  );
};

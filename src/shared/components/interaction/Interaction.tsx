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
  const [getIsShowAfterSun, setIsShowAfterSun] = createSignal(false);
  const [getAfterSunTxt, setAfterSunTxt] = createSignal<string>("");
  const [getSessionTimeLimit, setSessionTimeLimit] = createSignal<number>(0);

  let wrapperEl;
  let afterSunEl;
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
      const res = fadeOut(wrapperEl, 4000, 3000);
      frameNr = res.frameNr;
      res.promise.then(() => {
        if (wrapperEl.style.opacity < 0.1) {
          afterSun();
        }
      });
      setTimeout(() => {
        setIsShowSuccessSun(true);
      }, 3000);
    } else {
      const res = fadeOut(wrapperEl, 5000, 2000);
      frameNr = res.frameNr;
      res.promise.then(() => {
        if (wrapperEl.style.opacity < 0.1) {
          afterSun();
        }
      });
    }
  };

  const onSuccess = async (answerOrData?: Answer) => {
    setIsShowSuccessSun(true);
    // wait for sun
    await promiseTimeout(SUN_ANI_DURATION);
    await fadeOut(wrapperEl, SUN_ANI_DURATION).promise;

    if (MODE === "PURPOSE" && typeof answerOrData?.val === "string") {
      setAfterSunTxt(answerOrData.val);
      afterSun(true);
    } else {
      afterSun();
    }
  };

  const cancelCountdown = () => {
    if (!frameNr) {
      return;
    }
    if (getIsShowSuccessSun()) {
      return;
    }

    window.cancelAnimationFrame(frameNr);
    if (wrapperEl) {
      wrapperEl.style.transition = `opacity 1000ms ease-out`;
      wrapperEl.style.opacity = "1";
    }
  };

  const afterSun = async (isNoCountdownToRemoveAfterSun = false) => {
    setIsShowAfterSun(true);
    await promiseTimeout(10);
    if (isNoCountdownToRemoveAfterSun) {
      disableAfterSunRemoveCountdownAni();
    }
    afterSunEl.addEventListener("animationend", () => {
      teardown();
    });
  };

  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const fadeOutMainFinal = () => {
    if (wrapperEl) {
      fadeOut(wrapperEl, 150).promise.then(() => {
        afterSun();
      });
    } else {
      afterSun();
    }
  };

  const onSetTimeLimit = () => {
    const timeLimit =
      +window.prompt("How many minutes do you want to use this website?") * 60;

    if (timeLimit) {
      disableAfterSunRemoveCountdownAni();
      setSessionTimeLimit(timeLimit);

      if (currentSessionInterval) {
        window.clearInterval(currentSessionInterval);
      }
      currentSessionInterval = window.setInterval(() => {
        const v = getSessionTimeLimit();
        setSessionTimeLimit(v - 1);

        if (v <= 0) {
          window.clearInterval(currentSessionInterval);
          teardown();
          bro.runtime.sendMessage({ closeTab: true });
        }
      }, 1000);
    }
  };

  const disableAfterSunRemoveCountdownAni = () => {
    afterSunEl.style.animationPlayState = "paused";
    afterSunEl.style.animation = "none";
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOutMainFinal();
    }
  };

  const formatSessionTimeLimit = (timeLimit): string => {
    if (timeLimit > 0) {
      return timeLimit;
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
            ["minded-6622-top-right"]: !!getSessionTimeLimit(),
          }}
          onMouseEnter={() => {
            afterSunEl.style.animationPlayState = "paused";
          }}
          onMouseLeave={() => {
            afterSunEl.style.animationPlayState = "running";
          }}
        >
          <div id="minded-6622-after-sun-sun-wrapper">
            <div
              id="minded-6622-after-sun-sun"
              title="Close website"
              onclick={() => bro.runtime.sendMessage({ closeTab: true })}
              ref={afterSunEl}
            >
              {formatSessionTimeLimit(getSessionTimeLimit())}
            </div>
          </div>

          {getAfterSunTxt() && (
            <div id="minded-6622-after-sun-text">{getAfterSunTxt()}</div>
          )}

          <div id="minded-6622-additional-controls">
            <div
              title="Set a timelimit for website visit"
              onclick={onSetTimeLimit}
            >
              ⏱
            </div>
          </div>
        </div>
      ) : (
        <div
          id="minded-6622-coloured-wrapper"
          onclick={(ev) => {
            if (
              (ev.target as HTMLElement)?.id === "minded-6622-coloured-wrapper"
            ) {
              fadeOutMainFinal();
            }
          }}
          ref={wrapperEl}
        >
          <div id="minded-6622-box">
            {getIsShowSuccessSun() && (
              <div
                id="minded-6622-success-sun"
                title="Click sun to close website"
                onclick={() => {
                  bro.runtime.sendMessage({ closeTab: true });
                }}
              >
                <div></div>
                <div>click sun to close the website</div>
              </div>
            )}
            <Switch>
              <Match when={(MODE === "ACTION_ADVICE") as any}>
                <div id="minded-6622-action-advice">
                  <div>{ADVICE.txt}</div>
                  <div>{ADVICE.ico}</div>
                </div>
              </Match>
              <Match when={(MODE === "RATING") as any}>
                <RatingInteraction
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
              <Match when={(MODE === "PURPOSE") as any}>
                <Question
                  question={{
                    prompt:
                      QUESTION_CATEGORIES.XPurposeOfSession.questions[0].prompt,
                    t: QUESTION_CATEGORIES.XPurposeOfSession.questions[0].t,
                    categoryId: QuestionCategoryId.XPurposeOfSession,
                  }}
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
              <Match when={!MODE as any}>
                <Question
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
            </Switch>
          </div>
        </div>
      )}
    </>
  );
};

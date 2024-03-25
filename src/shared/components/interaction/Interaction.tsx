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
  if (rndInt > 95) {
    return "PURPOSE";
  }
  if (rndInt > 90) {
    return "RATING";
  }
  if (rndInt > 75) {
    return "ACTION_ADVICE";
  }
  return undefined;
})();
const ADVICE = getRndEntry(ACTION_ADVICES);
const SUN_ANI_DURATION = 1600;

export const Interaction: (props: { onHideAll: () => void }) => JSX.Element = (
  props,
) => {
  const [getIsShowSun, setIsShowSun] = createSignal(false);
  const [getIsShowAfterSun, setIsShowAfterSun] = createSignal(false);
  const [getAfterSunTxt, setAfterSunTxt] = createSignal<string>("");

  let wrapperEl;
  let afterSunEl;
  let frameNr;

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
        setIsShowSun(true);
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
    setIsShowSun(true);
    if (MODE === "PURPOSE" && typeof answerOrData?.val === "string") {
      setAfterSunTxt(answerOrData.val);
    }

    // wait for sun
    await promiseTimeout(SUN_ANI_DURATION);
    await fadeOut(wrapperEl, SUN_ANI_DURATION).promise;
    afterSun();
  };

  const cancelCountdown = () => {
    if (!frameNr) {
      return;
    }
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.transition = `opacity 1000ms ease-out`;
    wrapperEl.style.opacity = "1";
  };

  const afterSun = async () => {
    setIsShowAfterSun(true);
    await promiseTimeout(10);
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

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOutMainFinal();
    }
  };

  return (
    <>
      {getIsShowAfterSun() ? (
        <div
          id="minded-6622-after-sun"
          class={getAfterSunTxt() && "minded-6622-bottom"}
          title="click sun to close website"
          onclick={() => bro.runtime.sendMessage({ closeTab: true })}
          onMouseEnter={() => {
            afterSunEl.style.animationPlayState = "paused";
          }}
          onMouseLeave={() => {
            afterSunEl.style.animationPlayState = "running";
          }}
          ref={afterSunEl}
        >
          {getAfterSunTxt() && <div>{getAfterSunTxt()}</div>}
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
          {getIsShowSun() && (
            <div
              id="minded-6622-sun"
              title="click sun to close website"
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
      )}
    </>
  );
};

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
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import React from "react";
import { AfterSunComponent } from "@src/shared/components/interaction/AfterSun";
import { getSyncData } from "@src/shared/data/dataInterface";
import { getQuestionSmart } from "@src/util/getQuestionSmart";

const MODE: "RATING" | "ACTION_ADVICE" | "QUESTION" = (() => {
  const rndInt = getRndInt(0, 100);
  if (rndInt >= 95) {
    return "RATING";
  }
  if (rndInt >= 80) {
    return "ACTION_ADVICE";
  }
  return "QUESTION";
})();
const ADVICE = getRndEntry(ACTION_ADVICES);
const SUN_ANI_DURATION = 1600;

export const Interaction: (props: { onHideAll: () => void }) => JSX.Element = (
  props,
) => {
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getIsShowAfterSun, setIsShowAfterSun] = createSignal(false);
  const [getAfterSunTxt, setAfterSunTxt] = createSignal<string>("");
  const [getRndQuestion, setRndQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();

  let wrapperEl;
  let frameNr;
  let syncData;
  let questionUpdateCount = 0;

  onMount(async () => {
    // give a moment time for rendering
    setTimeout(() => {
      stopAllVideos();
    }, 1000);
    // NOTE: timeout makes this much more reliable
    setTimeout(() => {
      initFadeOut();
    }, 100);

    getSyncData().then((syncDataI) => {
      syncData = syncDataI;
      const rndQuestion = getQuestionSmart(syncDataI.answers);
      setRndQuestion(rndQuestion);

      switch (MODE) {
        case "ACTION_ADVICE":
          setAfterSunTxt(ADVICE.txt);
          setWasAnswerGiven(true);
          return;
        case "RATING":
          setAfterSunTxt("How would you rate your energy level today?");
          return;
        default:
          setAfterSunTxt(rndQuestion.t + "?");
      }
    });
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

  const updateQuestion = () => {
    if (syncData) {
      const rndQuestion =
        questionUpdateCount >= 3
          ? getRndEntry(QUESTIONS)
          : getQuestionSmart(syncData.answers);
      setRndQuestion(rndQuestion);
      setAfterSunTxt(rndQuestion.t + "?");
      setWasAnswerGiven(false);
      questionUpdateCount++;
    }
  };

  const onSuccess = async (answerOrData?: Answer) => {
    setAfterSunTxt(
      typeof answerOrData?.val === "string" ? answerOrData.val : "",
    );
    setWasAnswerGiven(true);
    setIsShowSuccessSun(true);
    // wait for sun
    await promiseTimeout(SUN_ANI_DURATION);
    await fadeOut(wrapperEl, SUN_ANI_DURATION).promise;

    afterSun();
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

  const afterSun = () => {
    setIsShowSuccessSun(false);
    setIsShowAfterSun(true);
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
        <AfterSunComponent
          wasAnswerGiven={getWasAnswerGiven()}
          bubbleTxt={getAfterSunTxt()}
          teardown={teardown}
          mode={MODE}
          onShowQuestionAgain={() => {
            setIsShowAfterSun(false);
            setIsShowSuccessSun(false);
          }}
          onChangeQuestion={() => updateQuestion()}
        />
      ) : (
        <div
          id="minded-6622-coloured-wrapper-dynamic"
          onclick={(ev) => {
            if (
              (ev.target as HTMLElement)?.id ===
              "minded-6622-coloured-wrapper-dynamic"
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
              <Match when={MODE === "ACTION_ADVICE"}>
                <div id="minded-6622-action-advice">
                  <div>{ADVICE.txt}</div>
                  <div>{ADVICE.ico}</div>
                </div>
              </Match>
              <Match when={MODE === "RATING"}>
                <RatingInteraction
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
              <Match when={MODE === "QUESTION"}>
                {getRndQuestion() && (
                  <Question
                    question={getRndQuestion()}
                    onCancelCountdown={cancelCountdown}
                    onSuccess={onSuccess}
                    onCancel={teardown}
                  />
                )}
              </Match>
            </Switch>
          </div>
        </div>
      )}
    </>
  );
};

/* @refresh reload */
import { createSignal, JSX, Match, onCleanup, onMount, Switch } from "solid-js";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { getRndInt } from "@src/util/getRndInt";
import { RatingInteraction } from "@src/shared/components/interaction/RatingInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { getRndEntry } from "@src/util/getRndEntry";
import {
  ACTION_ADVICES,
  ACTION_ADVICES_MAX_HOUR,
  ACTION_ADVICES_MIN_HOUR,
} from "@src/shared/data/actionAdvices";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { bro } from "@src/util/browser";
import { Answer } from "@src/shared/data/syncData";
import {
  QuestionCategoryId,
  QuestionForPrompt,
  QUESTIONS,
} from "@src/shared/data/questions";
import React from "react";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import { getSyncData } from "@src/shared/data/syncDataInterface";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
import { EmojiCheckin } from "@src/shared/components/interaction/emoji-checkin/EmojiCheckin";

export type InteractionMode =
  | "RATING"
  | "ACTION_ADVICE"
  | "QUESTION"
  | "EMOJI_CHECKIN";
const INITIAL_MODE: InteractionMode = (() => {
  // return "EMOJI_CHECKIN";

  const now = new Date();
  const nowHours = now.getHours();

  const rndInt = getRndInt(0, 100);
  if (rndInt >= 95) {
    return "RATING";
  }
  if (
    rndInt >= 80 &&
    nowHours < ACTION_ADVICES_MAX_HOUR &&
    nowHours >= ACTION_ADVICES_MIN_HOUR
  ) {
    return "ACTION_ADVICE";
  }
  return "QUESTION";
})();
const ADVICE = getRndEntry(ACTION_ADVICES);
const SUN_ANI_DURATION = 1600;

export const Interaction: (props: {
  host: string;
  onHideAll: () => void;
}) => JSX.Element = (props) => {
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getMode, setMode] = createSignal<InteractionMode>(INITIAL_MODE);
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getLittleSunTxt, setLittleSunTxt] = createSignal<string>("");
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

      switch (getMode()) {
        case "ACTION_ADVICE":
          setLittleSunTxt(ADVICE.txt);
          setWasAnswerGiven(true);
          return;
        case "RATING":
          setLittleSunTxt("How would you rate your energy level today?");
          return;
        default:
          setLittleSunTxt(rndQuestion.t + "?");
      }
    });
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  const initFadeOut = () => {
    if (getMode() === "ACTION_ADVICE") {
      const res = fadeOut(wrapperEl, 4000, 3000);
      frameNr = res.frameNr;
      res.promise.then(() => {
        if (wrapperEl.style.opacity < 0.1) {
          littleSun();
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
          littleSun();
        }
      });
    }
  };

  const updateQuestion = () => {
    setMode("QUESTION");
    if (syncData) {
      const rndQuestion =
        questionUpdateCount >= 5
          ? getRndEntry(QUESTIONS)
          : getQuestionSmart(syncData.answers);
      setRndQuestion(rndQuestion);
      setLittleSunTxt(rndQuestion.t + "?");
      setWasAnswerGiven(false);
      questionUpdateCount++;
    }
  };

  const onSuccess = async (answerOrData?: Answer) => {
    setLittleSunTxt(
      typeof answerOrData?.val === "string" ? answerOrData.val : "",
    );
    setWasAnswerGiven(true);
    setIsShowSuccessSun(true);
    // wait for sun
    await promiseTimeout(SUN_ANI_DURATION);
    await fadeOut(wrapperEl, SUN_ANI_DURATION).promise;

    littleSun();
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

  const littleSun = () => {
    setIsShowSuccessSun(false);
    setIsShowLittleSun(true);
  };

  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const fadeOutMainFinal = () => {
    if (wrapperEl) {
      fadeOut(wrapperEl, 150).promise.then(() => {
        littleSun();
      });
    } else {
      littleSun();
    }
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOutMainFinal();
    }
  };

  return (
    <>
      {getIsShowLittleSun() ? (
        <LittleSunComponent
          host={props.host}
          wasAnswerGiven={getWasAnswerGiven()}
          bubbleTxt={getLittleSunTxt()}
          teardown={teardown}
          onShowFreshQuestion={() => {
            updateQuestion();
            setIsShowLittleSun(false);
            setIsShowSuccessSun(false);
            initFadeOut();
          }}
          onShowQuestionAgain={() => {
            setIsShowLittleSun(false);
            setIsShowSuccessSun(false);
          }}
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
                title="Click sun to close tab"
                onclick={() => {
                  bro.runtime.sendMessage({ closeTab: true });
                }}
              >
                <div></div>
                <div>click sun to close the website</div>
              </div>
            )}
            <Switch>
              <Match when={getMode() === "EMOJI_CHECKIN"}>
                <EmojiCheckin
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
              <Match when={getMode() === "ACTION_ADVICE"}>
                <div id="minded-6622-action-advice">
                  <div>{ADVICE.txt}</div>
                  <div>{ADVICE.ico}</div>
                </div>
              </Match>
              <Match when={getMode() === "RATING"}>
                <RatingInteraction
                  questionCategoryId={QuestionCategoryId.XEnergyLevelToday}
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
              <Match when={getMode() === "QUESTION"}>
                {getRndQuestion() && (
                  <Question
                    question={getRndQuestion()}
                    onCancelCountdown={cancelCountdown}
                    onSuccess={onSuccess}
                    onChangeQuestion={() => updateQuestion()}
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

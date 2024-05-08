/* @refresh reload */
import { createSignal, JSX, Match, onCleanup, onMount, Switch } from "solid-js";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
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
import { MoodCheckin } from "@src/shared/components/interaction/mood-checkin/MoodCheckin";
import {
  getInteractionMode,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import { EmojiCheckin } from "@src/shared/components/interaction/emoji-checkin/EmojiCheckin";

const ADVICE = getRndEntry(ACTION_ADVICES);
// NOTE: val also needs to be set in css
const SUCCESS_SUN_ANI_IN_DURATION = 800;
const SUCCESS_SUN_STAY_DURATION = 3600;
const SUCCESS_SUN_ANI_FADE_OUT_DURATION = 1600;

export const Interaction: (props: {
  host: string;
  onHideAll: () => void;
}) => JSX.Element = (props) => {
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getLittleSunTxt, setLittleSunTxt] = createSignal<string>("");
  const [getRndQuestion, setRndQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();

  let wrapperEl;
  let successSunEl;
  let successSunSunEl;
  let frameNr;
  let syncData;
  let questionUpdateCount = 0;
  let questionIdBefore;

  onMount(async () => {
    // give a moment time for rendering
    setTimeout(() => {
      stopAllVideos();
    }, 1000);

    // setTimeout(() => {
    //   onSuccess();
    // }, 1000);

    setTimeout(() => {
      stopAllVideos();
    }, 5000);

    getSyncData().then((syncDataI) => {
      syncData = syncDataI;
      setMode(getInteractionMode(syncData));

      // NOTE: timeout makes this much more reliable
      setTimeout(() => {
        initFadeOut();
      }, 100);

      const rndQuestion = getQuestionSmart(syncDataI.answers);
      setRndQuestion(rndQuestion);
      questionIdBefore = rndQuestion.id;

      switch (getMode()) {
        case "ACTION_ADVICE":
          setLittleSunTxt(ADVICE.txt);
          setWasAnswerGiven(true);
          return;
        case "ENERGY_LVL":
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
      setTimeout(() => {
        // prevent weird state when opening and directly switching to a new tab
        if (!document.hidden) {
          showSuccessSunAniFlow();
        } else {
          window.addEventListener(
            "visibilitychange",
            () => {
              showSuccessSunAniFlow();
            },
            { once: true },
          );
        }
      }, 5000);
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

      if (questionIdBefore === rndQuestion.id) {
        questionUpdateCount++;
        updateQuestion();
      } else {
        questionIdBefore = rndQuestion.id;
        setRndQuestion(rndQuestion);
        setLittleSunTxt(rndQuestion.t + "?");
        setWasAnswerGiven(false);
        questionUpdateCount++;
      }
    }
  };

  const onSuccess = (answerOrData?: Answer) => {
    cancelCountdown();
    setLittleSunTxt(
      typeof answerOrData?.val === "string" ? answerOrData.val : "",
    );
    setWasAnswerGiven(true);
    setIsShowSuccessSun(true);
    showSuccessSunAniFlow();
  };

  const showSuccessSunAniFlow = async () => {
    setIsShowSuccessSun(true);
    // wait for sun
    successSunEl.style.animationDuration = `${SUCCESS_SUN_ANI_IN_DURATION}ms`;
    await promiseTimeout(SUCCESS_SUN_ANI_IN_DURATION);
    successSunSunEl.style.animation = `${SUCCESS_SUN_STAY_DURATION}ms minded6622successSunStay ease-in-out`;
    successSunSunEl.style.animationFillMode = `forwards`;

    await promiseTimeout(SUCCESS_SUN_STAY_DURATION);
    successSunSunEl.style.animationDuration = `0s`;
    successSunSunEl.style.animationFillMode = `forwards`;
    await promiseTimeout(SUCCESS_SUN_ANI_FADE_OUT_DURATION);

    await fadeOut(wrapperEl, SUCCESS_SUN_ANI_FADE_OUT_DURATION).promise;
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
            stopAllVideos();
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
                ref={successSunEl}
                title="Click sun to close tab"
                onclick={() => {
                  bro.runtime.sendMessage({ closeTab: true });
                }}
              >
                <div ref={successSunSunEl}></div>
                <div>click sun to close the website</div>
              </div>
            )}
            <Switch>
              <Match when={getMode() === "MOOD_CHECKIN"}>
                <MoodCheckin
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onSuccess}
                  onCancel={teardown}
                />
              </Match>
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
              <Match when={getMode() === "ENERGY_LVL"}>
                <EnergyLvlInteraction
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

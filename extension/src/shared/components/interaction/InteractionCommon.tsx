import {
  Component,
  createEffect,
  createSignal,
  Match,
  onMount,
  Switch,
} from "solid-js";
import { MoodCheckin } from "@src/shared/components/interaction/mood-checkin/MoodCheckin";
import { EmojiCheckin } from "@src/shared/components/interaction/emoji-checkin/EmojiCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energy-lvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { BrowsingBehaviorRatingInteraction } from "@src/shared/components/interaction/browsing-behavior-rating/BrowsingBehaviorRating";
import {
  getInteractionMode,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import { Answer } from "@src/dataInterface/syncData";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { IS_TOUCH_PRIMARY } from "@src/util/touch";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import SelfReflectionRating from "@src/shared/components/interaction/self-reflection-rating/SelfReflectionRating";

interface InteractionCommonProps {
  isReducedSuccessSun?: boolean;
  questionForPrompt?: QuestionForPrompt;
  isInitFadeout: boolean;
  wrapperEl: HTMLElement;
  onSuccessSunTap: () => void;
  onAfterSuccessSunFadeout: () => void;
  onAfterInteractionFadeout: () => void;
  onSetAnswer: (txt: string) => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onModeSet: (mode: InteractionMode) => void;
  onInteractionSubmitted?: () => void;
  onSkip: () => void;
}

const ADVICE = getRndEntry(ACTION_ADVICES);

// NOTE: ani in needs to match css value for smoothness
const SUCCESS_SUN_ANI_IN_DURATION = 800;
const SUCCESS_SUN_STAY_DURATION = 3600;
const SUCCESS_SUN_ANI_FADE_OUT_DURATION = 1600;
const SUCCESS_SUN_REDUCED_ANI_IN_DURATION = 400;
const SUCCESS_SUN_REDUCED_ANI_FADE_OUT_DURATION = 200;

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getInitialQuestion, setInitialQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();

  let successSunEl;
  let successSunSunEl;
  let frameNr;

  let isSuccessSunTapped = false;

  onMount(async () => {
    if (props.isInitFadeout) {
      // timeout needed otherwise it won't work probably because props.wrapperEl is passed yet?
      setTimeout(() => {
        initFadeOut();
      }, 200);
    }

    getSyncData().then((syncData) => {
      setAnswers(syncData.answers);
      if (props.questionForPrompt) {
        setInitialQuestion(props.questionForPrompt);
        setMode("QUESTION");
      } else {
        setInitialQuestion(getQuestionSmart(syncData.answers));
        setMode(getInteractionMode(syncData));
      }
    });
  });

  createEffect(() => {
    console.log("props.onModeSet", getMode());
    if (getMode()) {
      props.onModeSet(getMode());
    }
  });

  createEffect(() => {
    console.log("props.onUpdateQuestion", getInitialQuestion());
    if (getInitialQuestion()) {
      props.onUpdateQuestion(getInitialQuestion());
    }
  });

  const onInteractionSuccess = (answerOrData?: Answer) => {
    props.onInteractionSubmitted?.();
    cancelCountdown();
    showSuccessSunAniFlow();

    console.log("answerOrData", answerOrData);
    if (answerOrData) {
      props.onSetAnswer(answerOrData.val.toString());
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
    if (props.wrapperEl) {
      props.wrapperEl.style.transition = `opacity 1000ms ease-out`;
      props.wrapperEl.style.opacity = "1";
    }
  };

  const showSuccessSunAniFlow = async () => {
    // wait for keyboard to close on android
    if (IS_ANDROID) {
      window.focus();
      await promiseTimeout(100);
    }
    setIsShowSuccessSun(true);

    if (props.isReducedSuccessSun) {
      successSunEl.style.animationDuration = `${SUCCESS_SUN_REDUCED_ANI_IN_DURATION}ms`;
      await promiseTimeout(SUCCESS_SUN_REDUCED_ANI_IN_DURATION);
      successSunSunEl.style.animationDuration = `0s`;
      successSunSunEl.style.animationFillMode = `forwards`;
      await fadeOut(props.wrapperEl, SUCCESS_SUN_REDUCED_ANI_FADE_OUT_DURATION)
        .promise;
    } else {
      // wait for sun
      successSunEl.style.animationDuration = `${SUCCESS_SUN_ANI_IN_DURATION}ms`;
      await promiseTimeout(SUCCESS_SUN_ANI_IN_DURATION);
      successSunSunEl.style.animation = `${SUCCESS_SUN_STAY_DURATION}ms minded6622successSunStay ease-in-out`;
      successSunSunEl.style.animationFillMode = `forwards`;
      await promiseTimeout(SUCCESS_SUN_STAY_DURATION);
      successSunSunEl.style.animationDuration = `0s`;
      successSunSunEl.style.animationFillMode = `forwards`;
      await fadeOut(props.wrapperEl, SUCCESS_SUN_ANI_FADE_OUT_DURATION).promise;
    }

    if (!isSuccessSunTapped) {
      props.onAfterSuccessSunFadeout();
    }
  };

  const initFadeOut = () => {
    const res = fadeOut(props.wrapperEl, 5000, 2000);
    frameNr = res.frameNr;
    res.promise.then(() => {
      if (+props.wrapperEl.style.opacity < 0.1) {
        props.onAfterInteractionFadeout();
      }
    });
  };

  const onSuccessSunTap = () => {
    isSuccessSunTapped = true;
    props.onSuccessSunTap();
  };

  return (
    <>
      {getIsShowSuccessSun() && (
        <div
          id="minded-6622-success-sun"
          class={props.isReducedSuccessSun ? "reducedSuccessSun" : ""}
          ref={successSunEl}
          title="Click sun to close tab"
          onclick={onSuccessSunTap}
        >
          <div ref={successSunSunEl}></div>
          <div>
            {!props.isReducedSuccessSun && (
              <>
                {IS_TOUCH_PRIMARY ? "tap" : "click"} sun to close{" "}
                {IS_ANDROID ? "app" : "the website"}
              </>
            )}
          </div>
        </div>
      )}

      <div id="minded-6622-interaction-wrapper-box">
        <Switch>
          <Match when={getMode() === "SELF_REFLECTION_RATING"}>
            <SelfReflectionRating
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "MOOD_CHECKIN"}>
            <MoodCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "EMOJI_CHECKIN"}>
            <EmojiCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "ACTION_ADVICE"}>
            <div
              id="minded-6622-action-advice"
              class="txtBig"
              style="pointer-events:none;"
            >
              <div>{ADVICE.txt}</div>
              <div>{ADVICE.ico}</div>
            </div>
          </Match>
          <Match when={getMode() === "ENERGY_LVL"}>
            <EnergyLvlInteraction
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "BROWSING_BEHAVIOR_RATING"}>
            <BrowsingBehaviorRatingInteraction
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "QUESTION"}>
            {getInitialQuestion() && (
              <Question
                isChangeQuestion={true}
                initialQuestion={getInitialQuestion()}
                answers={getAnswers()}
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onUpdateQuestion={(question) =>
                  props.onUpdateQuestion(question)
                }
                onSkip={props.onSkip}
              />
            )}
          </Match>
        </Switch>
      </div>
    </>
  );
};

export default InteractionCommon;

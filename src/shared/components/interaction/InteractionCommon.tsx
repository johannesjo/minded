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
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { fadeOut, promiseTimeout } from "@src/util/animation"; // @ts-ignore
import { getQuestionSmart } from "@src/util/getQuestionSmart"; // @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";

interface InteractionCommonProps {
  wrapperEl: HTMLElement;
  onSuccessSunTap: () => void;
  onAfterSuccessSunFadeout: () => void;
  onUpdateLittleSunTxt: (txt: string) => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onModeSet: (mode: InteractionMode) => void;
  onSkip: () => void;
}

const ADVICE = getRndEntry(ACTION_ADVICES);

const SUCCESS_SUN_ANI_IN_DURATION = 800;
const SUCCESS_SUN_STAY_DURATION = 3600;
const SUCCESS_SUN_ANI_FADE_OUT_DURATION = 1600;

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getRndQuestion, setRndQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();

  let successSunEl;
  let successSunSunEl;
  let frameNr;
  let syncData;
  let questionUpdateCount = 0;
  let questionIdBefore;

  onMount(async () => {
    getSyncData().then((syncDataI) => {
      syncData = syncDataI;
      setMode(getInteractionMode(syncData));
      const rndQuestion = getQuestionSmart(syncDataI.answers);
      setRndQuestion(rndQuestion);
      questionIdBefore = rndQuestion.id;
    });
  });

  createEffect(() => {
    console.log("props.onModeSet");
    props.onModeSet(getMode());
  });
  createEffect(() => {
    console.log("props.onUpdateQuestion");
    props.onUpdateQuestion(getRndQuestion());
  });

  const onInteractionSuccess = (answerOrData?: Answer) => {
    cancelCountdown();
    showSuccessSunAniFlow(answerOrData);
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

  const showSuccessSunAniFlow = async (answerOrData?: Answer) => {
    setIsShowSuccessSun(true);
    // wait for sun
    successSunEl.style.animationDuration = `${SUCCESS_SUN_ANI_IN_DURATION}ms`;
    await promiseTimeout(SUCCESS_SUN_ANI_IN_DURATION);
    successSunSunEl.style.animation = `${SUCCESS_SUN_STAY_DURATION}ms minded6622successSunStay ease-in-out`;
    successSunSunEl.style.animationFillMode = `forwards`;
    await promiseTimeout(SUCCESS_SUN_STAY_DURATION);
    successSunSunEl.style.animationDuration = `0s`;
    successSunSunEl.style.animationFillMode = `forwards`;
    await fadeOut(props.wrapperEl, SUCCESS_SUN_ANI_FADE_OUT_DURATION).promise;
    props.onAfterSuccessSunFadeout();
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
        questionUpdateCount++;
      }
    }
  };

  return (
    <>
      {getIsShowSuccessSun() && (
        <div
          id="minded-6622-success-sun"
          ref={successSunEl}
          title="Click sun to close tab"
          onclick={() => {
            props.onSuccessSunTap();
          }}
        >
          <div ref={successSunSunEl}></div>
          <div>click sun to close the website</div>
        </div>
      )}

      <div id="minded-6622-box">
        <Switch>
          <Match when={getMode() === "MOOD_CHECKIN"}>
            <MoodCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSKip={props.onSkip}
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
            <div id="minded-6622-action-advice">
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
            {getRndQuestion() && (
              <Question
                question={getRndQuestion()}
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onChangeQuestion={updateQuestion}
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

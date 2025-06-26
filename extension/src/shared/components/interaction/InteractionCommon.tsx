import {
  Component,
  createEffect,
  createSignal,
  Match,
  onMount,
  Switch,
} from "solid-js";
import { MoodCheckin } from "@src/shared/components/interaction/moodCheckin/MoodCheckin";
import { EmojiCheckin } from "@src/shared/components/interaction/emojiCheckin/EmojiCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { AppUsageOrBrowsingBehavior } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/AppUsageOrBrowsingBehavior";
import {
  getInteractionMode,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import { Answer, SyncData } from "@src/dataInterface/syncData";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { fadeOut } from "@src/util/animation";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
import SelfAssessmentInteraction from "@src/shared/components/interaction/selfAssessmentInteraction/SelfAssessmentInteraction";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import Sun from "@src/shared/components/interaction/sun/Sun";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import { ShowAlternativeInteraction } from "@src/shared/components/interaction/alternatives/ShowAlternative";
import { SetAlternativeInteraction } from "@src/shared/components/interaction/alternatives/SetAlternative";
import "./InteractionCommon.scss";

interface InteractionCommonProps {
  questionForPrompt?: QuestionForPrompt;
  isInitFadeout: boolean;
  wrapperEl: HTMLElement;
  onAfterInteractionFadeout: () => void;
  onSetAnswer: (txt: string) => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onModeSet: (mode: InteractionMode) => void;
  onInteractionSubmitted?: () => void;
  onSkip: () => void;
  onSwipeDown: () => void;
  onSwipeUp: () => void;
}

const ADVICE = getRndEntry(ACTION_ADVICES);

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getSyncDataI, setSyncDataI] = createSignal<SyncData>();
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getInitialQuestion, setInitialQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();
  const [getShowBeProudMessage, setShowBeProudMessage] = createSignal(false);

  // Handler to trigger background animations from sun component
  const handleStartBackgroundAnimation = (direction: "up" | "down") => {
    setShowBeProudMessage(true);
    const event = new CustomEvent("startBackgroundAnimation", {
      detail: { direction },
    });
    window.dispatchEvent(event);
  };

  let frameNr;

  onMount(async () => {
    if (props.isInitFadeout) {
      setTimeout(() => {
        initFadeOut();
      }, 200);
    }

    getSyncData().then((syncData) => {
      setSyncDataI(syncData);
      setAnswers(syncData.answers);
      if (props.questionForPrompt) {
        setInitialQuestion(props.questionForPrompt);
        setMode("QUESTION");
      } else {
        const question = getQuestionSmart(syncData.answers);
        const mode = getInteractionMode(syncData);
        setInitialQuestion(question);
        setMode(mode);
      }
    });
  });

  createEffect(() => {
    if (getMode()) {
      props.onModeSet(getMode());
    }
  });

  createEffect(() => {
    if (getInitialQuestion()) {
      props.onUpdateQuestion(getInitialQuestion());
    }
  });

  const onInteractionSuccess = (answerOrData?: Answer) => {
    props.onInteractionSubmitted?.();
    cancelCountdown();

    if (answerOrData) {
      props.onSetAnswer(answerOrData.val.toString());
    }
  };

  const cancelCountdown = () => {
    if (!frameNr) {
      return;
    }
    window.cancelAnimationFrame(frameNr);
    if (props.wrapperEl) {
      props.wrapperEl.style.transition = `opacity 1000ms ease-out`;
      props.wrapperEl.style.opacity = "1";
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

  return (
    <>
      <BackgroundTransition dragThreshold={0.3} />

      <div id="minded-6622-interaction-wrapper-box">
        {/* Be proud message during final animation */}
        {getShowBeProudMessage() && (
          <div class="be-proud-message">Be proud!</div>
        )}

        <div class="sun-container">
          <Sun
            onSkip={props.onSkip}
            onSwipeDown={props.onSwipeDown}
            onSwipeUp={props.onSwipeUp}
            onStartBackgroundAnimation={handleStartBackgroundAnimation}
            dragThreshold={0.3}
          />
        </div>

        <Switch>
          <Match when={getMode() === "SELF_ASSESSMENT"}>
            {getSyncDataI() && (
              <SelfAssessmentInteraction
                syncData={getSyncDataI()}
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onSkip={props.onSkip}
              />
            )}
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
          <Match when={getMode() === "SHOW_ALTERNATIVE"}>
            <ShowAlternativeInteraction
              syncData={getSyncDataI()}
              onCancelCountdown={cancelCountdown}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "SET_ALTERNATIVE"}>
            <SetAlternativeInteraction
              onCancelCountdown={cancelCountdown}
              onSuccess={onInteractionSuccess}
              onSkip={props.onSkip}
            />
          </Match>
          <Match when={getMode() === "APP_USAGE_OR_BROWSING_BEHAVIOR"}>
            <AppUsageOrBrowsingBehavior
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

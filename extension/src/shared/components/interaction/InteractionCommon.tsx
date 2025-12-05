import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import {
  getInteractionMode,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import { Answer, SyncData } from "@src/dataInterface/syncData";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { fadeOut } from "@src/util/animation";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import Sun from "@src/shared/components/interaction/sun/Sun";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import { Ico } from "@src/shared/components/ui/Ico";
import { InteractionModeSwitch } from "@src/shared/components/interaction/InteractionModeSwitch";
import {
  createFadeAnimation,
  calculateFadeProgress,
  calculateOpacity,
} from "@src/shared/components/interaction/useFadeAnimation";
import { ANIMATION_TIMING } from "@src/shared/components/interaction/interactionAnimation.const";
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
  onFlingAway: () => void;
  onDragComplete: () => void;
  onCompletionStarted?: (started: boolean) => void;
  isFromDashboard?: boolean;
}

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  // Data state
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getSyncDataI, setSyncDataI] = createSignal<SyncData>();
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getInitialQuestion, setInitialQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();
  const [getPendingAnswer, setPendingAnswer] = createSignal<
    Answer | undefined
  >();

  // UI state
  const [getInteractionOpacity, setInteractionOpacity] = createSignal(1);
  const [getIsContentReady, setIsContentReady] = createSignal(false);
  const [getIsSkipping, setIsSkipping] = createSignal(false);
  const [getIsFinalAnimation, setIsFinalAnimation] = createSignal(false);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getShowSunInstructions, setShowSunInstructions] = createSignal(false);
  const [getHasAnswered, setHasAnswered] = createSignal(false);
  const [getShowBeProudMessage, setShowBeProudMessage] = createSignal(false);
  const [getIsCompletionStarted, setIsCompletionStarted] = createSignal(false);

  let frameNr: number | undefined;

  // Fade animation for mobile content
  const runFadeAnimation = (
    duration: number,
    onComplete: () => void,
    startOpacity = getInteractionOpacity(),
  ) => {
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = calculateFadeProgress(elapsed, duration);
      const opacity = calculateOpacity(startOpacity, progress);

      setInteractionOpacity(opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  };

  const handleSkip = () => {
    if (getIsSkipping()) return;
    setIsSkipping(true);

    if (getShowSunInstructions()) {
      props.onInteractionSubmitted?.();
      cancelCountdown();
    }

    if (props.wrapperEl) {
      const { promise } = fadeOut(
        props.wrapperEl,
        ANIMATION_TIMING.fadeOut.standard,
      );
      promise.then(() => props.onSkip());
    } else {
      runFadeAnimation(ANIMATION_TIMING.fadeOut.standard, () => props.onSkip());
    }
  };

  const handleStartBackgroundAnimation = (direction: "up" | "down") => {
    setIsFinalAnimation(true);

    runFadeAnimation(ANIMATION_TIMING.fadeOut.standard, () => {
      if (getShowSunInstructions()) {
        props.onInteractionSubmitted?.();
        cancelCountdown();
      }

      setTimeout(() => {
        setShowBeProudMessage(true);
      }, ANIMATION_TIMING.delay.beProudMessage);
    });

    const event = new CustomEvent("startBackgroundAnimation", {
      detail: { direction },
    });
    window.dispatchEvent(event);
  };

  const onInteractionSuccess = (answerOrData?: Answer) => {
    setHasAnswered(true);

    runFadeAnimation(ANIMATION_TIMING.fadeOut.fast, () => {
      if (answerOrData) {
        setPendingAnswer(answerOrData);
        props.onSetAnswer(answerOrData.val.toString());
      }

      setShowSunInstructions(true);
      setTimeout(() => {
        setInteractionOpacity(1);
      }, ANIMATION_TIMING.delay.sunInstructionsFadeIn);
    });
  };

  const cancelCountdown = () => {
    if (!frameNr) return;
    window.cancelAnimationFrame(frameNr);
    if (props.wrapperEl) {
      props.wrapperEl.style.transition = `opacity ${ANIMATION_TIMING.fadeOut.standard}ms ease-out`;
      props.wrapperEl.style.opacity = "1";
    }
  };

  const initFadeOut = () => {
    const res = fadeOut(
      props.wrapperEl,
      ANIMATION_TIMING.fadeOut.wrapper,
      ANIMATION_TIMING.delay.wrapperFadeStart,
    );
    frameNr = res.frameNr;
    res.promise.then(() => {
      if (+props.wrapperEl.style.opacity < 0.1) {
        props.onAfterInteractionFadeout();
      }
    });
  };

  // Drag progress event handler
  const handleDragProgress = (event: Event) => {
    const customEvent = event as CustomEvent<{
      isDragging: boolean;
      resetToInitial?: boolean;
    }>;
    const { isDragging, resetToInitial } = customEvent.detail;

    setIsDragging(isDragging);

    if (isDragging) {
      setInteractionOpacity(0);
    } else if (resetToInitial) {
      setInteractionOpacity(1);
    }
  };

  onMount(async () => {
    if (props.isInitFadeout) {
      setTimeout(() => initFadeOut(), ANIMATION_TIMING.delay.initFadeOut);
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

      setTimeout(
        () => setIsContentReady(true),
        ANIMATION_TIMING.delay.contentReady,
      );
    });

    window.addEventListener(
      "dragProgress",
      handleDragProgress as EventListener,
    );
  });

  onCleanup(() => {
    window.removeEventListener(
      "dragProgress",
      handleDragProgress as EventListener,
    );
  });

  createEffect(() => {
    const mode = getMode();
    if (mode) props.onModeSet(mode);
  });

  createEffect(() => {
    const question = getInitialQuestion();
    if (question) props.onUpdateQuestion(question);
  });

  return (
    <>
      <BackgroundTransition dragThreshold={0.3} />

      {getShowBeProudMessage() && <div class="be-proud-message">Be proud!</div>}

      <div
        id="minded-6622-interaction-wrapper-box"
        style={{
          "pointer-events":
            getIsFinalAnimation() || getIsCompletionStarted() ? "none" : "auto",
        }}
      >
        <div
          class="interaction-content"
          classList={{
            "fade-in": getIsContentReady(),
            dragging: getIsDragging(),
          }}
          style={{
            opacity: getShowSunInstructions() ? 0 : getInteractionOpacity(),
            "pointer-events":
              getShowSunInstructions() || getIsCompletionStarted()
                ? "none"
                : "auto",
          }}
        >
          <InteractionModeSwitch
            mode={getMode()}
            syncData={getSyncDataI()}
            initialQuestion={getInitialQuestion()}
            answers={getAnswers()}
            onCancelCountdown={cancelCountdown}
            onSuccess={onInteractionSuccess}
            onSkip={handleSkip}
            onUpdateQuestion={(question) => props.onUpdateQuestion(question)}
          />
        </div>

        {/* Sun instructions overlay */}
        {getShowSunInstructions() &&
          !getIsCompletionStarted() &&
          !props.isFromDashboard && (
            <div
              class="interaction-content sun-instructions-overlay"
              classList={{
                "fade-in": getShowSunInstructions(),
                dragging: getIsDragging(),
              }}
              style={{
                opacity: getInteractionOpacity(),
                "pointer-events": getIsCompletionStarted() ? "none" : "auto",
              }}
            >
              <div class="sun-instructions txtSmaller">
                <p>Fling the sun away to let go.</p>
                <p>Drag the sun down to ground yourself.</p>
                <p>Tap the sun 5 times to proceed.</p>
              </div>
            </div>
          )}

        {!props.isFromDashboard && (
          <div class="sun-container">
            <Sun
              onSkip={handleSkip}
              onFlingAway={props.onFlingAway}
              onDragComplete={props.onDragComplete}
              onStartBackgroundAnimation={handleStartBackgroundAnimation}
              onCompletionStarted={(started) => {
                setIsCompletionStarted(started);
                props.onCompletionStarted?.(started);
              }}
            />
          </div>
        )}
      </div>

      {props.isFromDashboard && (
        <div class="back-button-wrapper">
          <button
            class="btnTxt"
            onClick={() => props.onSkip()}
            aria-label="Go back"
          >
            <Ico name="arrowBack" /> Back
          </button>
        </div>
      )}
    </>
  );
};

export default InteractionCommon;

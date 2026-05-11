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
import {
  getQuestionSmart,
  getQuestionSemiSmart,
} from "@src/util/getQuestionSmart";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import Sun from "@src/shared/components/interaction/sun/Sun";
import {
  setSoundEnabled,
  preloadSounds,
  playInterventionSound,
} from "@src/shared/components/interaction/sun/sunAudio";
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

import { TimeSelection } from "@src/shared/components/interaction/timeSelection/TimeSelection";

interface InteractionCommonProps {
  questionForPrompt?: QuestionForPrompt;
  isInitFadeout: boolean;
  wrapperEl: HTMLElement;
  shadowRoot?: ShadowRoot;
  onAfterInteractionFadeout: () => void;
  onSetAnswer: (txt: string) => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onModeSet: (mode: InteractionMode) => void;
  onInteractionSubmitted?: () => void;
  onSkip: () => void;
  onFlingAway: () => void;
  onDragComplete: () => void;
  onCompletionStarted?: (started: boolean) => void;
  onSetSessionLimit?: (seconds: number) => void;
  isFromDashboard?: boolean;
}

/** Check if there's a focused input/textarea with modified content */
const isActivelyEditing = (shadowRoot?: ShadowRoot | null): boolean => {
  const activeEl = shadowRoot?.activeElement ?? document.activeElement;
  if (
    activeEl instanceof HTMLTextAreaElement ||
    activeEl instanceof HTMLInputElement
  ) {
    const value = activeEl.value.trim();
    const placeholder = activeEl.placeholder || "";
    // Has content beyond just whitespace and not just the placeholder
    return value.length > 0 && value !== placeholder;
  }
  return false;
};

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  const SUN_TAP_THRESHOLD = 3;

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
  const [getShowTimeSelection, setShowTimeSelection] = createSignal(false);
  const [getShowTimeSelectionOverlay, setShowTimeSelectionOverlay] =
    createSignal(false);
  const [getSunHintStep, setSunHintStep] = createSignal(0);

  let frameNr: number | undefined;
  let fadeAnimationFrame: number | undefined;
  let timeSelectionTimeout: number | undefined;
  let successTimeout: number | undefined;
  let fadeInAnimationFrame: number | undefined;

  createEffect(() => {
    if (!getShowSunInstructions()) {
      setSunHintStep(0);
      return;
    }

    setSunHintStep(0);
    const t1 = window.setTimeout(() => setSunHintStep(1), 1200);
    const t2 = window.setTimeout(() => setSunHintStep(2), 2400);
    onCleanup(() => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    });
  });

  createEffect(() => {
    if (getShowTimeSelection()) {
      const timer = setTimeout(() => setShowTimeSelectionOverlay(true), 500);
      onCleanup(() => clearTimeout(timer));
    } else {
      setShowTimeSelectionOverlay(false);
    }
  });

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
        fadeAnimationFrame = requestAnimationFrame(animate);
      } else {
        fadeAnimationFrame = undefined;
        onComplete();
      }
    };

    fadeAnimationFrame = requestAnimationFrame(animate);
  };

  const handleSkip = () => {
    if (getIsSkipping()) return;
    // Don't skip if user is actively editing an input
    if (isActivelyEditing(props.shadowRoot)) return;
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

  const handleTimeSelection = (seconds: number) => {
    // Fade out the entire overlay before transitioning to Little Sun
    if (props.wrapperEl) {
      props.wrapperEl.style.transition = "opacity 300ms ease-out";
      props.wrapperEl.style.opacity = "0";
    }

    // After fade out completes, call native side
    timeSelectionTimeout = window.setTimeout(() => {
      timeSelectionTimeout = undefined;
      setShowTimeSelection(false);
      setInteractionOpacity(1);
      setShowSunInstructions(false);
      if (props.onSetSessionLimit) {
        props.onSetSessionLimit(seconds);
      }
    }, 300);
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

      if (props.isFromDashboard) {
        props.onInteractionSubmitted?.();
        props.onAfterInteractionFadeout();
        return;
      }

      successTimeout = window.setTimeout(() => {
        successTimeout = undefined;
        setShowSunInstructions(true);
        // Use a small delay to ensure the DOM has updated with opacity 0 before starting the fade in
        fadeInAnimationFrame = requestAnimationFrame(() => {
          // Manually animate fade in since runFadeAnimation is for fade out
          const startTime = Date.now();
          const duration = 2000;

          const animateFadeIn = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            setInteractionOpacity(progress);

            if (progress < 1) {
              fadeInAnimationFrame = requestAnimationFrame(animateFadeIn);
            } else {
              fadeInAnimationFrame = undefined;
            }
          };

          fadeInAnimationFrame = requestAnimationFrame(animateFadeIn);
        });
      }, 1000);
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
      // Don't proceed if user is actively editing
      if (isActivelyEditing(props.shadowRoot)) {
        cancelCountdown();
        return;
      }
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

    getSyncData()
      .then((syncData) => {
        setSyncDataI(syncData);
        setAnswers(syncData.answers);

        // Initialize sound settings (default to enabled)
        const soundEnabled = syncData.cfg.soundEnabled ?? true;
        setSoundEnabled(soundEnabled);
        if (soundEnabled) {
          preloadSounds();
        }

        if (props.questionForPrompt) {
          setInitialQuestion(props.questionForPrompt);
          setMode("QUESTION");
        } else {
          const question = getQuestionSmart(syncData.answers);
          const mode = getInteractionMode(syncData);
          setInitialQuestion(question);
          setMode(mode);
        }

        setTimeout(() => {
          setIsContentReady(true);
          playInterventionSound();
        }, ANIMATION_TIMING.delay.contentReady);
      })
      .catch((error) => {
        console.error("InteractionCommon: Failed to load sync data", error);
        // Fallback to QUESTION mode with a default question
        const fallbackQuestion = getQuestionSemiSmart();
        setInitialQuestion(fallbackQuestion);
        setMode("QUESTION");
        setIsContentReady(true);
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

    // Clean up any pending animation frames and timeouts
    if (fadeAnimationFrame) {
      cancelAnimationFrame(fadeAnimationFrame);
    }
    if (fadeInAnimationFrame) {
      cancelAnimationFrame(fadeInAnimationFrame);
    }
    if (timeSelectionTimeout) {
      clearTimeout(timeSelectionTimeout);
    }
    if (successTimeout) {
      clearTimeout(successTimeout);
    }
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

      {getShowTimeSelectionOverlay() && (
        <div
          class="time-selection-overlay"
          style={{
            position: "fixed",
            inset: "0",
            "z-index": 1100,
            display: "flex",
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "center",
            "pointer-events": "auto",
          }}
        >
          <TimeSelection
            onSelectTime={handleTimeSelection}
            onCancel={() => {
              setShowTimeSelection(false);
            }}
          />
        </div>
      )}

      <div
        id="minded-6622-interaction-wrapper-box"
        style={{
          "pointer-events":
            getShowTimeSelection() ||
            getIsFinalAnimation() ||
            getIsCompletionStarted()
              ? "none"
              : "auto",
        }}
      >
        <div
          class="interaction-content"
          classList={{
            "fade-in": getIsContentReady() && !getShowTimeSelection(),
            dragging: getIsDragging(),
          }}
          style={{
            opacity: getShowTimeSelection()
              ? 0
              : getShowSunInstructions()
                ? 0
                : getInteractionOpacity(),
            transition: getShowTimeSelection()
              ? "opacity 0.3s ease-out"
              : undefined,
            "pointer-events":
              getShowTimeSelection() ||
              getShowSunInstructions() ||
              getIsCompletionStarted()
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
                "fade-in": getShowSunInstructions() && !getShowTimeSelection(),
                dragging: getIsDragging(),
              }}
              style={{
                opacity: getShowTimeSelection() ? 0 : getInteractionOpacity(),
                transition: getShowTimeSelection()
                  ? "opacity 0.3s ease-out"
                  : undefined,
                "pointer-events":
                  getIsCompletionStarted() || getShowTimeSelection()
                    ? "none"
                    : "auto",
              }}
            >
              <div class="sun-instructions txtSmaller">
                <p class="sun-instructions-line is-visible">
                  Fling the sun away to let go.
                </p>
                <p
                  class="sun-instructions-line"
                  classList={{ "is-visible": getSunHintStep() >= 1 }}
                >
                  Drag the sun down to ground yourself.
                </p>
                <p
                  class="sun-instructions-line"
                  classList={{ "is-visible": getSunHintStep() >= 2 }}
                >
                  Tap the sun {SUN_TAP_THRESHOLD} times to continue.
                </p>
              </div>
            </div>
          )}

        {!props.isFromDashboard && (
          <div
            class="sun-container"
            style={{
              opacity: getShowTimeSelection() ? 0 : 1,
              transition: "opacity 0.3s ease-out",
              "pointer-events": getShowTimeSelection() ? "none" : "all",
            }}
          >
            <Sun
              onSkip={() => setShowTimeSelection(true)}
              onFlingAway={props.onFlingAway}
              onDragComplete={props.onDragComplete}
              onStartBackgroundAnimation={handleStartBackgroundAnimation}
              onCompletionStarted={(started) => {
                setIsCompletionStarted(started);
                props.onCompletionStarted?.(started);
              }}
              eventRoot={props.shadowRoot}
              tapThreshold={SUN_TAP_THRESHOLD}
            />
          </div>
        )}
      </div>

      {props.isFromDashboard && (
        <div class="back-button-wrapper">
          <button
            type="button"
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

import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import {
  getInteractionModeDecision,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import {
  Answer,
  SessionIntent,
  SessionPlatform,
  SessionTarget,
  SyncData,
} from "@src/dataInterface/syncData";
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
import { TimeSelection } from "@src/shared/components/interaction/timeSelection/TimeSelection";
import { IntentSelection } from "@src/shared/components/interaction/intentSelection/IntentSelection";
import {
  advanceIntentSelectionToTime,
  cancelIntentSelection,
  cancelTimeSelection,
  shouldAskIntent,
} from "@src/shared/components/interaction/sessionLimit";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";
import { getPostSunPauseSeconds } from "@src/shared/components/interaction/postSunPause";
import { StrongFrictionBreathPause } from "@src/shared/components/interaction/breathPause/StrongFrictionBreathPause";

const ALTERNATIVE_STAY_BRIEFLY_SECONDS = 2 * 60;

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
  onSetSessionLimit?: (seconds: number, intent?: SessionIntent) => void;
  interactionTarget?: SessionTarget;
  interactionPlatform?: SessionPlatform;
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
  const SCREEN_TRANSITION_MS = ANIMATION_TIMING.fadeOut.standard;

  // Data state
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getSyncDataI, setSyncDataI] = createSignal<SyncData>();
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getFrictionLevel, setFrictionLevel] =
    createSignal<FrictionLevel>("normal");
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
  const [getShowBreathPause, setShowBreathPause] = createSignal(false);
  const [getShowIntentSelection, setShowIntentSelection] = createSignal(false);
  const [getIsPostSunScreenFading, setIsPostSunScreenFading] =
    createSignal(false);
  const [getPendingIntent, setPendingIntent] = createSignal<
    SessionIntent | undefined
  >();
  const [getShowTimeSelection, setShowTimeSelection] = createSignal(false);
  const [getShowTimeSelectionOverlay, setShowTimeSelectionOverlay] =
    createSignal(false);
  const [getIsIntentSelectionArmed, setIsIntentSelectionArmed] =
    createSignal(false);
  const [getIsTimeSelectionArmed, setIsTimeSelectionArmed] =
    createSignal(false);
  const [getSunHintStep, setSunHintStep] = createSignal(0);
  const getShowPostSunOverlay = () =>
    getShowBreathPause() || getShowIntentSelection() || getShowTimeSelection();

  let frameNr: number | undefined;
  let fadeAnimationFrame: number | undefined;
  let timeSelectionTimeout: number | undefined;
  let postSunScreenTransitionTimeout: number | undefined;
  let successTimeout: number | undefined;
  let fadeInAnimationFrame: number | undefined;
  let initFadeOutTimeout: number | undefined;
  let contentReadyTimeout: number | undefined;
  let beProudMessageTimeout: number | undefined;
  let intentSelectionArmTimeout: number | undefined;
  let timeSelectionArmTimeout: number | undefined;
  let isDisposed = false;
  const interactionEventTarget = props.shadowRoot ?? window;

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
    if (getShowPostSunOverlay()) {
      setShowTimeSelectionOverlay(true);
    } else {
      setShowTimeSelectionOverlay(false);
      setIsPostSunScreenFading(false);
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
      promise.then(() => {
        if (!isDisposed) props.onSkip();
      });
    } else {
      runFadeAnimation(ANIMATION_TIMING.fadeOut.standard, () => {
        if (!isDisposed) props.onSkip();
      });
    }
  };

  const handleSunContinue = () => {
    cancelCountdown();
    clearIntentSelectionArmTimeout();
    clearTimeSelectionArmTimeout();
    setPendingIntent(undefined);
    setIsIntentSelectionArmed(false);
    setIsTimeSelectionArmed(false);

    if (getPostSunPauseSeconds(getFrictionLevel()) > 0) {
      setShowBreathPause(true);
      return;
    }

    if (shouldAskIntent(getFrictionLevel())) {
      showIntentSelectionAfterOverlayTransition();
      return;
    }

    showTimeSelectionAfterOverlayTransition();
  };

  const handleBreathPauseComplete = () => {
    if (isDisposed) return;
    clearIntentSelectionArmTimeout();
    setShowBreathPause(false);
    setIsIntentSelectionArmed(true);
    setShowIntentSelection(true);
  };

  const handleBreathPauseCancel = () => {
    cancelCountdown();
    setPendingIntent(undefined);
    setShowBreathPause(false);
    setIsIntentSelectionArmed(false);
  };

  const clearIntentSelectionArmTimeout = () => {
    if (intentSelectionArmTimeout) {
      window.clearTimeout(intentSelectionArmTimeout);
      intentSelectionArmTimeout = undefined;
    }
  };

  const showIntentSelectionAfterOverlayTransition = () => {
    clearIntentSelectionArmTimeout();
    setIsIntentSelectionArmed(false);
    setShowIntentSelection(true);
    intentSelectionArmTimeout = window.setTimeout(() => {
      intentSelectionArmTimeout = undefined;
      if (isDisposed) return;

      setIsIntentSelectionArmed(true);
    }, SCREEN_TRANSITION_MS);
  };

  const clearTimeSelectionArmTimeout = () => {
    if (timeSelectionArmTimeout) {
      window.clearTimeout(timeSelectionArmTimeout);
      timeSelectionArmTimeout = undefined;
    }
  };

  const armTimeSelectionAfterOverlayTransition = () => {
    clearTimeSelectionArmTimeout();
    setIsTimeSelectionArmed(false);
    timeSelectionArmTimeout = window.setTimeout(() => {
      timeSelectionArmTimeout = undefined;
      if (isDisposed) return;

      setIsTimeSelectionArmed(true);
    }, SCREEN_TRANSITION_MS);
  };

  const showTimeSelectionAfterOverlayTransition = () => {
    setShowTimeSelection(true);
    armTimeSelectionAfterOverlayTransition();
  };

  const handleTimeSelection = (seconds: number) => {
    const intent = getPendingIntent();
    clearTimeSelectionArmTimeout();
    setIsTimeSelectionArmed(false);
    setIsPostSunScreenFading(true);
    // Fade out the entire overlay before transitioning to Little Sun
    if (props.wrapperEl) {
      props.wrapperEl.style.transition = `opacity ${SCREEN_TRANSITION_MS}ms ease-out`;
      props.wrapperEl.style.opacity = "0";
    }

    // After fade out completes, call native side
    timeSelectionTimeout = window.setTimeout(() => {
      timeSelectionTimeout = undefined;
      if (isDisposed) return;

      setShowTimeSelection(false);
      setInteractionOpacity(1);
      setShowSunInstructions(false);
      setPendingIntent(undefined);
      if (props.onSetSessionLimit) {
        props.onSetSessionLimit(seconds, intent);
      }
    }, SCREEN_TRANSITION_MS);
  };

  const showTimeSelectionAfterIntent = (intent: SessionIntent | undefined) => {
    if (postSunScreenTransitionTimeout) {
      window.clearTimeout(postSunScreenTransitionTimeout);
    }

    clearIntentSelectionArmTimeout();
    clearTimeSelectionArmTimeout();
    setIsIntentSelectionArmed(false);
    setIsTimeSelectionArmed(false);
    setIsPostSunScreenFading(true);
    postSunScreenTransitionTimeout = window.setTimeout(() => {
      postSunScreenTransitionTimeout = undefined;
      advanceIntentSelectionToTime(
        intent,
        setPendingIntent,
        setShowIntentSelection,
        setShowTimeSelection,
      );
      armTimeSelectionAfterOverlayTransition();
      requestAnimationFrame(() => setIsPostSunScreenFading(false));
    }, SCREEN_TRANSITION_MS);
  };

  const handleStartBackgroundAnimation = (direction: "up" | "down") => {
    setIsFinalAnimation(true);

    runFadeAnimation(ANIMATION_TIMING.fadeOut.standard, () => {
      if (isDisposed) return;

      if (getShowSunInstructions()) {
        props.onInteractionSubmitted?.();
        cancelCountdown();
      }

      beProudMessageTimeout = window.setTimeout(() => {
        beProudMessageTimeout = undefined;
        if (isDisposed) return;

        setShowBeProudMessage(true);
      }, ANIMATION_TIMING.delay.beProudMessage);
    });

    const event = new CustomEvent("startBackgroundAnimation", {
      detail: { direction },
    });
    interactionEventTarget.dispatchEvent(event);
  };

  const onInteractionSuccess = (answerOrData?: Answer) => {
    setHasAnswered(true);
    setPendingIntent(undefined);
    setIsIntentSelectionArmed(false);
    setIsTimeSelectionArmed(false);
    setShowBreathPause(false);

    runFadeAnimation(SCREEN_TRANSITION_MS, () => {
      if (isDisposed) return;

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
        if (isDisposed) return;

        setShowSunInstructions(true);
        // Use a small delay to ensure the DOM has updated with opacity 0 before starting the fade in
        fadeInAnimationFrame = requestAnimationFrame(() => {
          if (isDisposed) return;

          // Manually animate fade in since runFadeAnimation is for fade out
          const startTime = Date.now();
          const duration = SCREEN_TRANSITION_MS;

          const animateFadeIn = () => {
            if (isDisposed) return;

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
      if (isDisposed) return;

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
      initFadeOutTimeout = window.setTimeout(() => {
        initFadeOutTimeout = undefined;
        if (!isDisposed) {
          initFadeOut();
        }
      }, ANIMATION_TIMING.delay.initFadeOut);
    }

    getSyncData()
      .then((syncData) => {
        if (isDisposed) return;

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
          setFrictionLevel("normal");
          setMode("QUESTION");
        } else {
          const question = getQuestionSmart(syncData.answers);
          const modeDecision = getInteractionModeDecision(syncData, {
            target: props.interactionTarget,
            platform: props.interactionPlatform,
            isMainView: props.isFromDashboard,
          });
          setInitialQuestion(question);
          setFrictionLevel(modeDecision.frictionLevel);
          setMode(modeDecision.mode);
        }

        contentReadyTimeout = window.setTimeout(() => {
          contentReadyTimeout = undefined;
          if (isDisposed) return;

          setIsContentReady(true);
          playInterventionSound();
        }, ANIMATION_TIMING.delay.contentReady);
      })
      .catch((error) => {
        if (isDisposed) return;

        console.error("InteractionCommon: Failed to load sync data", error);
        // Fallback to QUESTION mode with a default question
        const fallbackQuestion = getQuestionSemiSmart();
        setInitialQuestion(fallbackQuestion);
        setFrictionLevel("normal");
        setMode("QUESTION");
        setIsContentReady(true);
      });

    interactionEventTarget.addEventListener(
      "dragProgress",
      handleDragProgress as EventListener,
    );
  });

  onCleanup(() => {
    isDisposed = true;

    interactionEventTarget.removeEventListener(
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
    if (postSunScreenTransitionTimeout) {
      clearTimeout(postSunScreenTransitionTimeout);
    }
    if (intentSelectionArmTimeout) {
      clearTimeout(intentSelectionArmTimeout);
    }
    if (timeSelectionArmTimeout) {
      clearTimeout(timeSelectionArmTimeout);
    }
    if (successTimeout) {
      clearTimeout(successTimeout);
    }
    if (initFadeOutTimeout) {
      clearTimeout(initFadeOutTimeout);
    }
    if (contentReadyTimeout) {
      clearTimeout(contentReadyTimeout);
    }
    if (beProudMessageTimeout) {
      clearTimeout(beProudMessageTimeout);
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
      <BackgroundTransition dragThreshold={0.3} shadowRoot={props.shadowRoot} />

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
            "--screen-transition-ms": `${SCREEN_TRANSITION_MS}ms`,
          }}
        >
          <div
            class="post-sun-screen"
            classList={{ "is-fading": getIsPostSunScreenFading() }}
          >
            {getShowBreathPause() ? (
              <StrongFrictionBreathPause
                seconds={getPostSunPauseSeconds(getFrictionLevel())}
                onComplete={handleBreathPauseComplete}
                onCancel={handleBreathPauseCancel}
              />
            ) : getShowIntentSelection() ? (
              <IntentSelection
                isArmed={getIsIntentSelectionArmed()}
                onSelectIntent={showTimeSelectionAfterIntent}
                onCancel={() => {
                  setIsIntentSelectionArmed(false);
                  clearIntentSelectionArmTimeout();
                  cancelIntentSelection(
                    setPendingIntent,
                    setShowIntentSelection,
                  );
                }}
                onCancelCountdown={cancelCountdown}
              />
            ) : (
              <TimeSelection
                isArmed={getIsTimeSelectionArmed()}
                intent={getPendingIntent()}
                onSelectTime={handleTimeSelection}
                onCancel={() => {
                  setIsTimeSelectionArmed(false);
                  clearTimeSelectionArmTimeout();
                  cancelTimeSelection(setPendingIntent, setShowTimeSelection);
                }}
              />
            )}
          </div>
        </div>
      )}

      <div
        id="minded-6622-interaction-wrapper-box"
        style={{
          "pointer-events":
            getShowPostSunOverlay() ||
            getIsFinalAnimation() ||
            getIsCompletionStarted()
              ? "none"
              : "auto",
        }}
      >
        <div
          class="interaction-content"
          classList={{
            "fade-in": getIsContentReady() && !getShowPostSunOverlay(),
            dragging: getIsDragging(),
          }}
          style={{
            opacity: getShowPostSunOverlay()
              ? 0
              : getShowSunInstructions()
                ? 0
                : getInteractionOpacity(),
            transition: getShowPostSunOverlay()
              ? `opacity ${SCREEN_TRANSITION_MS}ms ease-out`
              : undefined,
            "pointer-events":
              getShowPostSunOverlay() ||
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
            onStayBriefly={() =>
              handleTimeSelection(ALTERNATIVE_STAY_BRIEFLY_SECONDS)
            }
            onAddBetterAlternative={() => setMode("SET_ALTERNATIVE")}
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
                "fade-in": getShowSunInstructions() && !getShowPostSunOverlay(),
                dragging: getIsDragging(),
              }}
              style={{
                opacity: getShowPostSunOverlay() ? 0 : getInteractionOpacity(),
                transition: getShowPostSunOverlay()
                  ? `opacity ${SCREEN_TRANSITION_MS}ms ease-out`
                  : undefined,
                "pointer-events":
                  getIsCompletionStarted() || getShowPostSunOverlay()
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
              opacity: getShowPostSunOverlay() ? 0 : 1,
              transition: `opacity ${SCREEN_TRANSITION_MS}ms ease-out`,
              "pointer-events": getShowPostSunOverlay() ? "none" : "all",
            }}
          >
            <Sun
              onSkip={handleSunContinue}
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

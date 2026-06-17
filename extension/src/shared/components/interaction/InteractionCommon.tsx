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
  Alternative,
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
  getSunSettleForPhase,
  type SunPhase,
} from "@src/shared/components/interaction/sun/sunSettle";
import {
  getSunPosition,
  getSunRole,
  registerSunInteraction,
  setBreathSeconds,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import {
  setSoundEnabled,
  preloadSounds,
  playInterventionSound,
} from "@src/shared/components/interaction/sun/sunAudio";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import { Ico } from "@src/shared/components/ui/Ico";
import { InteractionModeSwitch } from "@src/shared/components/interaction/InteractionModeSwitch";
import {
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
import type { PatternInsight } from "@src/shared/components/interaction/patternInsight/patternInsight";

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
  /**
   * Use the single shell-owned sun (new-tab app shell) instead of rendering an
   * own <Sun>. When true, this drives the sunStore role and registers its
   * terminal-outcome handlers there. Default false → self-owned sun (content
   * script / Android / iOS / styleguide unchanged).
   */
  useShellSun?: boolean;
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

const getInteractionRoot = (shadowRoot?: ShadowRoot) =>
  shadowRoot?.getElementById("minded-6622") ??
  document.getElementById("minded-6622");

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  const SUN_TAP_THRESHOLD = 3;
  const SCREEN_TRANSITION_MS = ANIMATION_TIMING.fadeOut.standard;
  const ARM_WINDOW_MS = ANIMATION_TIMING.delay.armWindow;

  // Data state
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getSyncDataI, setSyncDataI] = createSignal<SyncData>();
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getFrictionLevel, setFrictionLevel] =
    createSignal<FrictionLevel>("normal");
  const [getInitialQuestion, setInitialQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();
  const [getPatternInsight, setPatternInsight] = createSignal<
    PatternInsight | undefined
  >();
  const [getPendingAnswer, setPendingAnswer] = createSignal<
    Answer | undefined
  >();
  const [getAlternativeToReplace, setAlternativeToReplace] = createSignal<
    Alternative | undefined
  >();
  const setModeWithoutReplacement = (mode: InteractionMode) => {
    setAlternativeToReplace(undefined);
    setMode(mode);
  };

  // UI state
  const [getInteractionOpacity, setInteractionOpacity] = createSignal(1);
  const [getIsContentReady, setIsContentReady] = createSignal(false);
  const [getIsSkipping, setIsSkipping] = createSignal(false);
  const [getIsFinalAnimation, setIsFinalAnimation] = createSignal(false);
  const [getIsModeTransitioning, setIsModeTransitioning] = createSignal(false);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getShowSunInstructions, setShowSunInstructions] = createSignal(false);
  const [getHasAnswered, setHasAnswered] = createSignal(false);
  const [getShowBeProudMessage, setShowBeProudMessage] = createSignal(false);
  const [getIsCompletionStarted, setIsCompletionStarted] = createSignal(false);
  const [getShowBreathPause, setShowBreathPause] = createSignal(false);
  // The sun's lifecycle phase. "interactive" = draggable; "breathing" and
  // "resting" keep it on screen and transform it through the post-sun flow
  // (breath pause → intent/time) instead of hiding and replacing it. The
  // phase → settle-target mapping lives in sunSettle.ts, shared with the
  // styleguide harness so the two can't drift.
  const [getLocalSunPhase, setLocalSunPhase] =
    createSignal<SunPhase>("interactive");

  // With the shell sun (new-tab app shell) the phase IS the shared store role,
  // so the single persistent disc morphs through the flow; otherwise it's this
  // component's own signal driving its own <Sun>. Every call site uses these two
  // transparently, so the rest of the flow logic is identical in both modes.
  const getSunPhase = (): SunPhase =>
    props.useShellSun ? getSunRole() : getLocalSunPhase();
  const setSunPhase = (phase: SunPhase) => {
    if (props.useShellSun) {
      // The breathing settle needs the pause length; feed it to the store before
      // the role flip so the shell sun glides to the right anchor.
      if (phase === "breathing") {
        setBreathSeconds(getPostSunPauseSeconds(getFrictionLevel()));
      }
      setSunRole(phase);
    } else {
      setLocalSunPhase(phase);
    }
  };

  const getSunSettle = () =>
    getSunSettleForPhase(
      getSunPhase(),
      getPostSunPauseSeconds(getFrictionLevel()),
    );
  const [getShowIntentSelection, setShowIntentSelection] = createSignal(false);
  const [getIsPostSunScreenFading, setIsPostSunScreenFading] =
    createSignal(false);
  // True while the interaction-content / sun is fading out before the
  // post-sun overlay mounts. Lets us sequence: fade out first, then fade in.
  const [getIsExitingInteraction, setIsExitingInteraction] =
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
  const [getDragObjectName, setDragObjectName] = createSignal<"sun" | "moon">(
    "sun",
  );
  const getShowPostSunOverlay = () =>
    getShowBreathPause() || getShowIntentSelection() || getShowTimeSelection();
  // The sun stays in the dashboard flow on every platform now: tapping the
  // companion sun hands off to the interactive sun (it moves like a regular
  // intervention) instead of just vanishing straight into the question.
  const getIsSunInFlow = () => true;
  const getIsInteractionSunShown = () =>
    getIsSunInFlow() &&
    (getSunPhase() !== "interactive" ||
      (!getIsExitingInteraction() && !getShowPostSunOverlay()));

  let frameNr: number | undefined;
  let fadeAnimationFrame: number | undefined;
  let modeTransitionTimeout: number | undefined;
  let modeTransitionFadeInFrame: number | undefined;
  let timeSelectionTimeout: number | undefined;
  let postSunScreenTransitionTimeout: number | undefined;
  let successTimeout: number | undefined;
  let fadeInAnimationFrame: number | undefined;
  let initFadeOutTimeout: number | undefined;
  let contentReadyTimeout: number | undefined;
  let beProudMessageTimeout: number | undefined;
  let intentSelectionArmTimeout: number | undefined;
  let timeSelectionArmTimeout: number | undefined;
  let rootThemeObserver: MutationObserver | undefined;
  let wrapperThemeObserver: MutationObserver | undefined;
  let isDisposed = false;
  const interactionEventTarget = props.shadowRoot ?? window;

  const syncDragObjectNameWithTheme = () => {
    const root = getInteractionRoot(props.shadowRoot);
    const isDark =
      root?.classList.contains("minded-6622-dark") ||
      props.wrapperEl?.classList.contains("minded-6622-dark") ||
      !!props.wrapperEl?.closest(".minded-6622-dark");

    setDragObjectName(isDark ? "moon" : "sun");
  };

  const observeThemeClass = (
    el: HTMLElement | undefined | null,
  ): MutationObserver | undefined => {
    if (!el || typeof MutationObserver === "undefined") return undefined;

    const observer = new MutationObserver(syncDragObjectNameWithTheme);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return observer;
  };

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
      setIsExitingInteraction(false);
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

  const transitionToMode = (
    mode: InteractionMode,
    updateStateBeforeModeChange: () => void,
  ) => {
    if (getIsModeTransitioning()) return;

    setIsModeTransitioning(true);
    runFadeAnimation(SCREEN_TRANSITION_MS, () => {
      if (isDisposed) return;

      updateStateBeforeModeChange();
      setMode(mode);

      setInteractionOpacity(0);
      modeTransitionFadeInFrame = requestAnimationFrame(() => {
        modeTransitionFadeInFrame = undefined;
        if (isDisposed) return;

        setInteractionOpacity(1);
        modeTransitionTimeout = window.setTimeout(() => {
          modeTransitionTimeout = undefined;
          if (!isDisposed) setIsModeTransitioning(false);
        }, SCREEN_TRANSITION_MS);
      });
    });
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

    // Fade interaction-content out first, then mount the post-sun overlay so
    // its fade-in plays after — not concurrent with — the fade-out.
    setIsExitingInteraction(true);
    const willBreathe = getPostSunPauseSeconds(getFrictionLevel()) > 0;
    // Keep the sun on screen and let it morph through the post-sun flow instead
    // of fading it out and replacing it with a separate sun.
    setSunPhase(willBreathe ? "breathing" : "resting");
    if (postSunScreenTransitionTimeout) {
      window.clearTimeout(postSunScreenTransitionTimeout);
    }
    postSunScreenTransitionTimeout = window.setTimeout(() => {
      postSunScreenTransitionTimeout = undefined;
      if (isDisposed) return;

      if (willBreathe) {
        setShowBreathPause(true);
        return;
      }

      if (shouldAskIntent(getFrictionLevel())) {
        showIntentSelectionAfterOverlayTransition();
        return;
      }

      showTimeSelectionAfterOverlayTransition();
    }, SCREEN_TRANSITION_MS);
  };

  const handleBreathPauseComplete = () => {
    if (isDisposed) return;
    clearIntentSelectionArmTimeout();
    setShowBreathPause(false);
    // Glide the same sun up to its smaller resting anchor for the choices.
    setSunPhase("resting");
    setIsIntentSelectionArmed(true);
    setShowIntentSelection(true);
  };

  const handleBreathPauseCancel = () => {
    cancelCountdown();
    setPendingIntent(undefined);
    setShowBreathPause(false);
    setSunPhase("interactive");
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
    setShowIntentSelection(true);
    if (ARM_WINDOW_MS <= 0) {
      setIsIntentSelectionArmed(true);
      return;
    }

    setIsIntentSelectionArmed(false);
    intentSelectionArmTimeout = window.setTimeout(() => {
      intentSelectionArmTimeout = undefined;
      if (isDisposed) return;

      setIsIntentSelectionArmed(true);
    }, ARM_WINDOW_MS);
  };

  const clearTimeSelectionArmTimeout = () => {
    if (timeSelectionArmTimeout) {
      window.clearTimeout(timeSelectionArmTimeout);
      timeSelectionArmTimeout = undefined;
    }
  };

  const armTimeSelectionAfterOverlayTransition = () => {
    clearTimeSelectionArmTimeout();
    if (ARM_WINDOW_MS <= 0) {
      setIsTimeSelectionArmed(true);
      return;
    }

    setIsTimeSelectionArmed(false);
    timeSelectionArmTimeout = window.setTimeout(() => {
      timeSelectionArmTimeout = undefined;
      if (isDisposed) return;

      setIsTimeSelectionArmed(true);
    }, ARM_WINDOW_MS);
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
    // Send the sun gliding to the bottom-left corner (the Little Sun's home) as
    // the overlay fades, so the persistent timer reads as the same sun settling
    // in rather than a new element popping up.
    setSunPhase("departing");
    // Reveal the page beneath by fading the sky and the choices — but NOT the
    // sun. Fading the whole wrapper's opacity (the old approach) faded the sun
    // along with it, so by the time it reached the corner it had all but
    // dissolved. `is-departing` fades only the background layers, leaving the
    // sun fully opaque so it reads as a companion gliding into the corner to
    // settle in as the Little Sun.
    if (props.wrapperEl) {
      props.wrapperEl.classList.add("is-departing");
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

  // Shell-sun mode: route the single shell-owned disc's terminal outcomes back
  // to this interaction. These are the exact closures the own <Sun> is wired to
  // below — just relocated. Last registration wins; cleared on unmount.
  onMount(() => {
    if (!props.useShellSun) return;
    const unregister = registerSunInteraction({
      onSkip: handleSunContinue,
      onFlingAway: props.onFlingAway,
      onDragComplete: props.onDragComplete,
      onStartBackgroundAnimation: handleStartBackgroundAnimation,
      onCompletionStarted: (started) => {
        setIsCompletionStarted(started);
        props.onCompletionStarted?.(started);
      },
      tapThreshold: SUN_TAP_THRESHOLD,
    });
    onCleanup(unregister);
  });

  onMount(async () => {
    syncDragObjectNameWithTheme();
    rootThemeObserver = observeThemeClass(getInteractionRoot(props.shadowRoot));
    wrapperThemeObserver = observeThemeClass(props.wrapperEl);

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
          setModeWithoutReplacement("QUESTION");
        } else {
          const question = getQuestionSmart(syncData.answers);
          const modeDecision = getInteractionModeDecision(syncData, {
            target: props.interactionTarget,
            platform: props.interactionPlatform,
            isMainView: props.isFromDashboard,
          });
          setInitialQuestion(question);
          setFrictionLevel(modeDecision.frictionLevel);
          setPatternInsight(modeDecision.patternInsight);
          setModeWithoutReplacement(modeDecision.mode);
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
        setModeWithoutReplacement("QUESTION");
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
    if (modeTransitionFadeInFrame) {
      cancelAnimationFrame(modeTransitionFadeInFrame);
    }
    if (modeTransitionTimeout) {
      clearTimeout(modeTransitionTimeout);
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
    rootThemeObserver?.disconnect();
    wrapperThemeObserver?.disconnect();
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
      <BackgroundTransition
        dragThreshold={0.3}
        shadowRoot={props.shadowRoot}
        isSunGradientAttached={getIsInteractionSunShown()}
        // Shell sun lives outside this tree, so read its position from the store
        // instead of the window event it no longer dispatches.
        positionSource={props.useShellSun ? getSunPosition : undefined}
      />

      {getShowBeProudMessage() && <div class="be-proud-message">Be proud!</div>}

      {getShowTimeSelectionOverlay() && (
        <div
          class="time-selection-overlay"
          classList={{ "has-resting-sun": getSunPhase() === "resting" }}
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
                  setSunPhase("interactive");
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
                  setSunPhase("interactive");
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
            getIsExitingInteraction() ||
            getShowPostSunOverlay() ||
            getIsModeTransitioning() ||
            getIsFinalAnimation() ||
            getIsCompletionStarted()
              ? "none"
              : "auto",
          // While the sun is settled (breathing/resting), lift the wrapper
          // above the post-sun overlay (z-index 1100 below) so the persistent
          // sun stays visible over the breath copy and the choices. The wrapper
          // is click-through here (pointer-events: none), so the buttons beneath
          // still receive taps.
          "z-index": getSunPhase() !== "interactive" ? 1101 : undefined,
        }}
      >
        <div
          class="interaction-content"
          classList={{
            "fade-in":
              getIsContentReady() &&
              !getShowPostSunOverlay() &&
              !getIsExitingInteraction(),
            dragging: getIsDragging(),
          }}
          style={{
            opacity:
              getIsExitingInteraction() || getShowPostSunOverlay()
                ? 0
                : getShowSunInstructions()
                  ? 0
                  : getInteractionOpacity(),
            transition:
              getIsExitingInteraction() || getShowPostSunOverlay()
                ? `opacity ${SCREEN_TRANSITION_MS}ms ease-out`
                : undefined,
            "pointer-events":
              getIsExitingInteraction() ||
              getShowPostSunOverlay() ||
              getIsModeTransitioning() ||
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
            patternInsight={getPatternInsight()}
            onCancelCountdown={cancelCountdown}
            onSuccess={onInteractionSuccess}
            onSkip={handleSkip}
            onLeaveNow={props.onFlingAway}
            alternativeToReplace={getAlternativeToReplace()}
            onAddBetterAlternative={(alternative) => {
              transitionToMode("SET_ALTERNATIVE", () => {
                setAlternativeToReplace(alternative);
              });
            }}
            onShowAlternativeFromPatternInsight={() =>
              transitionToMode("SHOW_ALTERNATIVE", () => {
                setAlternativeToReplace(undefined);
              })
            }
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
                "fade-in":
                  getShowSunInstructions() &&
                  !getShowPostSunOverlay() &&
                  !getIsExitingInteraction(),
                dragging: getIsDragging(),
              }}
              style={{
                opacity:
                  getIsExitingInteraction() || getShowPostSunOverlay()
                    ? 0
                    : getInteractionOpacity(),
                transition:
                  getIsExitingInteraction() || getShowPostSunOverlay()
                    ? `opacity ${SCREEN_TRANSITION_MS}ms ease-out`
                    : undefined,
                "pointer-events":
                  getIsCompletionStarted() ||
                  getIsExitingInteraction() ||
                  getShowPostSunOverlay()
                    ? "none"
                    : "auto",
              }}
            >
              <div class="sun-instructions txtSmaller">
                <p class="sun-instructions-line is-visible">
                  Fling the {getDragObjectName()} away to let go.
                </p>
                <p
                  class="sun-instructions-line"
                  classList={{ "is-visible": getSunHintStep() >= 1 }}
                >
                  Drag the {getDragObjectName()} down to ground yourself.
                </p>
                <p
                  class="sun-instructions-line"
                  classList={{ "is-visible": getSunHintStep() >= 2 }}
                >
                  Tap the {getDragObjectName()} {SUN_TAP_THRESHOLD} times to
                  continue.
                </p>
              </div>
            </div>
          )}

        {getIsSunInFlow() && !props.useShellSun && (
          <div
            class="sun-container"
            style={{
              opacity: getIsInteractionSunShown() ? 1 : 0,
              transition: `opacity ${SCREEN_TRANSITION_MS}ms ease-out`,
              "pointer-events":
                getIsInteractionSunShown() && getSunPhase() === "interactive"
                  ? "all"
                  : "none",
            }}
          >
            <Sun
              variant={getDragObjectName()}
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
              settle={getSunSettle()}
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

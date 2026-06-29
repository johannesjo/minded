import {
  batch,
  Component,
  createEffect,
  createMemo,
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
import {
  getSyncData,
  IS_ANDROID,
  markInteractionModeShown,
} from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import Sun from "@src/shared/components/interaction/sun/Sun";
import {
  getSunSettleForPhase,
  LITTLE_SUN_CORNER_PX_ANDROID,
  LITTLE_SUN_CORNER_PX_WEB,
  LITTLE_SUN_DISC_PX_ANDROID,
  LITTLE_SUN_DISC_PX_WEB,
  restingSunAnchorFromRect,
  sunDepartSettleAt,
  sunRestingSettle,
  type SunPhase,
} from "@src/shared/components/interaction/sun/sunSettle";
import {
  getRestingSunAnchor,
  getSunRole,
  registerSunInteraction,
  setBreathStartedAt,
  setInteractiveSunAnchor,
  setIsShellSunHidden,
  setIsSunHandoffInFlight,
  setRestingSunAnchor,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import {
  setSoundEnabled,
  preloadSounds,
  playInterventionSound,
} from "@src/shared/components/interaction/sun/sunAudio";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { InteractionModeSwitch } from "@src/shared/components/interaction/InteractionModeSwitch";
import { displayTargetName } from "@src/util/displayTargetName";
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
import { shouldIgnoreStaleSuccess } from "@src/shared/components/interaction/interactionSuccessGuard";
import { shouldShowSunInstructionsOverlay } from "@src/shared/components/interaction/sunInstructionsVisibility";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { StrongFrictionBreathPause } from "@src/shared/components/interaction/breathPause/StrongFrictionBreathPause";
import { GroundingOverlay } from "@src/shared/components/interaction/grounding/GroundingOverlay";
import { GROUNDING_FADE_MS } from "@src/shared/components/interaction/grounding/grounding.const";
import { LetGoOverlay } from "@src/shared/components/interaction/letGo/LetGoOverlay";
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
  /**
   * Reverse of the departing hand-off: this interaction is being re-shown after a
   * Little Sun session timer ran out, so the sun should *arrive* by gliding out of
   * the Little Sun's corner (small + amber) and growing into the centred
   * interactive disc — the mirror of the depart morph — rather than snapping in at
   * full size. The same one sun reads as continuing from where the timer rested.
   * Default false (a first intervention, with no Little Sun to morph from, just
   * appears).
   */
  morphInFromCorner?: boolean;
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
  // The question fades out quickly once the user advances past it (triple tap),
  // so it's gone before the choices arrive — no slow lingering, no overlap. The
  // post-tap hand-off waits this long so the choices fade in only after it.
  const QUESTION_FADE_OUT_MS = 400;
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
  const [, setPendingAnswer] = createSignal<Answer | undefined>();
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
  // Suppresses the content's opacity transition for a single commit so the
  // outgoing block can be hidden instantly (no fade-out) before the new one
  // fades in — see transitionToMode.
  const [getIsContentSwapInstant, setIsContentSwapInstant] =
    createSignal(false);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getShowSunInstructions, setShowSunInstructions] = createSignal(false);
  // True from the triple tap until the choices mount: the question is fading out
  // but no breath/choices screen has appeared yet. Keeps the persistent sun on
  // screen (and inert) through that gap instead of letting it blink out.
  const [getIsAdvancingToChoices, setIsAdvancingToChoices] =
    createSignal(false);
  const [getHasAnswered, setHasAnswered] = createSignal(false);
  const [getShowBeProudMessage, setShowBeProudMessage] = createSignal(false);
  // Dashboard only: dragging the sun *down* opens the "Stay a while?" grounding
  // offer (meditate / be present), and flinging it *up/away* opens the "What do
  // you want to let go of?" reflection — instead of just completing. The gesture
  // direction picks the ritual; randomness never enters here.
  const [getShowGroundingOffer, setShowGroundingOffer] = createSignal(false);
  const [getShowLetGoOffer, setShowLetGoOffer] = createSignal(false);
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
  // True while the sun is gliding *in* from the Little Sun's corner (the reverse
  // of the departing hand-off). Seeded from the prop so the very first paint
  // already places the disc at the corner — getSunSettle reads this before the
  // mount effect can run — then cleared a couple frames after mount to launch the
  // glide home. Self-owned sun only; the shell sun never re-shows after a Little
  // Sun, so it has no corner to arrive from.
  const [getIsArrivingFromCorner, setIsArrivingFromCorner] = createSignal(
    !props.useShellSun &&
      !!props.morphInFromCorner &&
      // Only morph when the glide can actually be seen and is wanted: skip under
      // reduced-motion (just appear centred, no animation) and when the tab is
      // hidden — rAF is paused there, so the disc would otherwise sit frozen in
      // the corner until the tab is foregrounded (a cross-tab timer-clear can
      // swap a backgrounded tab straight to the intervention).
      !prefersReducedMotion() &&
      (typeof document === "undefined" || !document.hidden),
  );
  const getSunPhase = (): SunPhase =>
    props.useShellSun ? getSunRole() : getLocalSunPhase();
  const setSunPhase = (phase: SunPhase) => {
    if (props.useShellSun) {
      setSunRole(phase);
    } else {
      setLocalSunPhase(phase);
    }
  };

  // Centre (viewport fractions) where the native Android Little Sun bubble will
  // rest, read once on mount. The bubble can't move while the interaction is up
  // (it isn't shown then), so a single read is stable for this interaction; the
  // departing morph targets it instead of the fixed corner. null off Android or
  // when the native side can't report it.
  const [getLittleSunRestCenter, setLittleSunRestCenter] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  if (IS_ANDROID && props.interactionPlatform === "android") {
    onMount(() => {
      try {
        const raw = androidInterface.getLittleSunRestCenter?.();
        if (!raw) return;
        const parsed = JSON.parse(raw) as { fracX?: number; fracY?: number };
        // Number.isFinite (not typeof) so a NaN slips through to NaN offsets;
        // clamp to the viewport so a bad value can't fling the disc off-screen.
        if (Number.isFinite(parsed.fracX) && Number.isFinite(parsed.fracY)) {
          const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
          setLittleSunRestCenter({
            x: clamp01(parsed.fracX!),
            y: clamp01(parsed.fracY!),
          });
        }
      } catch {
        // Leave null → the morph falls back to the fixed corner.
      }
    });
  }

  // The Little Sun's resting spot, expressed as a sun settle (corner, exact disc
  // size, amber halo). The departing hand-off glides *to* it; the arriving morph
  // mounts the disc *at* it and glides home — both must target the same point so
  // the two morphs are perfect mirrors. On Android the native Little Sun is a
  // free-floating bubble the user can park anywhere (the persisted spot is read on
  // mount), so glide to its real centre; fall back to the fixed corner when the
  // position is unknown (older app, read failed). Disc size + corner differ per
  // platform (native overlay is smaller), so match the right ones.
  // Memoized so it returns a STABLE object identity (it only re-derives when the
  // Android bubble position signal changes). getSunSettle is read reactively, and
  // the <Sun> settle effect keys off object identity — a fresh object each call
  // would risk a spurious corner→corner glide on the Android branch, which reads
  // getLittleSunRestCenter(). Pure constants on web, so it's computed once there.
  const getCornerSettle = createMemo(() => {
    const isAndroid = props.interactionPlatform === "android";
    if (isAndroid) {
      const restCenter = getLittleSunRestCenter();
      if (restCenter) return sunDepartSettleAt(restCenter);
    }
    return getSunSettleForPhase(
      "departing",
      // companionBottomYPx is only read for the "companion" phase, which the
      // local (non-shell) sun never enters — keep the default.
      undefined,
      isAndroid ? LITTLE_SUN_CORNER_PX_ANDROID : LITTLE_SUN_CORNER_PX_WEB,
      isAndroid ? LITTLE_SUN_DISC_PX_ANDROID : LITTLE_SUN_DISC_PX_WEB,
    );
  });

  const getSunSettle = () => {
    // Arriving: hold the disc at the Little Sun's corner so it mounts exactly
    // where the timer rested; clearing the flag (post-mount) drops the settle to
    // the interactive rest and the sun glides home — the reverse of departing.
    if (getIsArrivingFromCorner()) {
      return getCornerSettle();
    }
    // Resting: tuck under the measured choices block (mirrors the shell sun's
    // getSunSettleForCurrentRole), falling back to the static rest target until
    // the choices are measured.
    if (getSunPhase() === "resting") {
      const anchor = getRestingSunAnchor();
      if (anchor) return sunRestingSettle(anchor);
    }
    // Departing: glide to the Little Sun's corner so the persistent timer reads as
    // the same sun settling in rather than a new element popping up.
    if (getSunPhase() === "departing") {
      return getCornerSettle();
    }
    const isAndroid = props.interactionPlatform === "android";
    return getSunSettleForPhase(
      getSunPhase(),
      // companionBottomYPx is only read for the "companion" phase, which the
      // local (non-shell) sun never enters — keep the default.
      undefined,
      isAndroid ? LITTLE_SUN_CORNER_PX_ANDROID : LITTLE_SUN_CORNER_PX_WEB,
      isAndroid ? LITTLE_SUN_DISC_PX_ANDROID : LITTLE_SUN_DISC_PX_WEB,
    );
  };

  // Launch the arrive-from-corner glide: the disc has mounted snapped to the
  // Little Sun's corner (settle = getCornerSettle while arriving), so clearing the
  // flag drops the settle to the interactive rest and the <Sun>'s settle effect
  // glides it home, growing back to full size and warming amber → white — the
  // mirror of the departing morph. Deferred two frames so the corner snap has
  // committed first; a same-tick clear would never paint the corner and the disc
  // would just fade in centred (no morph).
  if (getIsArrivingFromCorner()) {
    onMount(() => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!isDisposed) setIsArrivingFromCorner(false);
        }),
      );
    });
  }

  // A mode rides its own animation on the real sun: glide the single disc into
  // the looping surf wave (SURF_WAVE_PATTERN, carried by the surfing settle), so
  // the wave reads as the same sun the user always sees rather than a second one
  // drawn on top. The mode ends it with endSunWave when its wave is done.
  const startSunWave = () => {
    setSunPhase("surfing");
  };
  const endSunWave = () => {
    setSunPhase("interactive");
  };

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
      getIsAdvancingToChoices() ||
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
  let groundingBgResetTimeout: number | undefined;
  let intentSelectionArmTimeout: number | undefined;
  let timeSelectionArmTimeout: number | undefined;
  let rootThemeObserver: MutationObserver | undefined;
  let wrapperThemeObserver: MutationObserver | undefined;
  // Empty slot the content flow reserves for the shell sun; the disc (a fixed
  // overlay) is measured to this element's centre so it always rests in the gap
  // the real layout left for it. Shell flow only.
  let sunPlaceholderEl: HTMLDivElement | undefined;
  let sunPlaceholderObserver: ResizeObserver | undefined;
  // The intent/time choices overlay; the resting sun is measured to sit just
  // beneath the choices block inside it (see measureRestingSunAnchor).
  let restingOverlayEl: HTMLDivElement | undefined;
  let restingSunObserver: ResizeObserver | undefined;
  let isDisposed = false;
  // The direction of the just-completed sun gesture. The terminal outcome
  // callbacks (onFlingAway/onDragComplete) carry no direction, so we stash it
  // here from handleStartBackgroundAnimation, which fires first.
  let lastCompletionDirection: "up" | "down" | undefined;
  const interactionEventTarget = props.shadowRoot ?? window;

  // Dashboard down-drag opens the grounding offer (and up/away the let-go offer)
  // while keeping the interaction mounted, so the sun's terminal close (fade +
  // unmount) must not fire. Every other case closes as before.
  const runTerminalOutcome = (close: () => void) => {
    if (
      props.isFromDashboard &&
      lastCompletionDirection === "down" &&
      getShowGroundingOffer()
    ) {
      return;
    }
    if (
      props.isFromDashboard &&
      lastCompletionDirection === "up" &&
      getShowLetGoOffer()
    ) {
      return;
    }
    close();
  };

  // Close a dashboard offer (grounding / let-go) and fade home. Nothing is
  // "submitted" on these paths, and onAfterInteractionFadeout now fades the sky
  // out via handleHideWithFade, which already refreshes the dashboard once the
  // fade lands — so we don't also call onInteractionSubmitted here (that would
  // refresh twice per close).
  const finishGrounding = () => {
    setShowGroundingOffer(false);
    // The offer may have hidden the shell sun once a sit began; reveal it so it
    // returns to its companion home as the sky fades out (mirrors finishLetGo).
    if (props.useShellSun) setIsShellSunHidden(false);
    props.onAfterInteractionFadeout();
  };

  const finishLetGo = () => {
    setShowLetGoOffer(false);
    // Reveal the shell sun again; the fade-home below settles it onto the bottom
    // bar as the sky fades out, so it returns cleanly instead of staying hidden.
    if (props.useShellSun) setIsShellSunHidden(false);
    props.onAfterInteractionFadeout();
  };

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

  // Tell the shell sun to go inert the moment we begin handing off to the choices
  // (isExitingInteraction flips true at the top of handleSunContinue, ~400ms
  // before the buttons mount). Without this the disc stays interactive — and so
  // pointer-grabbing — over the just-shown choices until the deferred rAF flips
  // the role to "resting", swallowing taps (see getIsSunHandoffInFlight).
  if (props.useShellSun) {
    createEffect(() => setIsSunHandoffInFlight(getIsExitingInteraction()));
    onCleanup(() => setIsSunHandoffInFlight(false));
    // Never leave the shell sun stranded hidden if we unmount mid-let-go.
    onCleanup(() => setIsShellSunHidden(false));
  }

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

    // Swap straight to the new block while it's hidden, then fade only the new
    // block in — no fade-out of the outgoing one. The hide is instant (the
    // content transition is suppressed for this commit) and the content swaps in
    // the same commit, so the old block is never shown mid-fade. Restoring the
    // transition a frame before raising opacity lets the fade-in actually play.
    batch(() => {
      updateStateBeforeModeChange();
      setMode(mode);
      setIsContentSwapInstant(true);
      setInteractionOpacity(0);
    });

    modeTransitionFadeInFrame = requestAnimationFrame(() => {
      modeTransitionFadeInFrame = undefined;
      if (isDisposed) return;

      setIsContentSwapInstant(false);
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

    // Fade the interaction content out; the sun stays on screen and morphs
    // through the post-sun flow instead of being replaced by a separate sun.
    setIsExitingInteraction(true);
    const willBreathe = getPostSunPauseSeconds(getFrictionLevel()) > 0;
    if (willBreathe) {
      // Glide the sun up to its breath anchor, then show the breath pause after
      // the interaction content has faded out (sequential, not concurrent).
      setSunPhase("breathing");
      if (postSunScreenTransitionTimeout) {
        window.clearTimeout(postSunScreenTransitionTimeout);
      }
      postSunScreenTransitionTimeout = window.setTimeout(() => {
        postSunScreenTransitionTimeout = undefined;
        if (isDisposed) return;
        setShowBreathPause(true);
      }, SCREEN_TRANSITION_MS);
      return;
    }

    // No breath pause: let the question fade out first (the sun stays put and
    // visible via isAdvancingToChoices), THEN reveal the choices and glide the
    // sun to its reserved slot in one motion. Sequential — the question is gone
    // before the choices arrive, so they never overlap (no misclicks) — and the
    // sun never detours via the static fallback.
    setIsAdvancingToChoices(true);
    if (postSunScreenTransitionTimeout) {
      window.clearTimeout(postSunScreenTransitionTimeout);
    }
    postSunScreenTransitionTimeout = window.setTimeout(() => {
      postSunScreenTransitionTimeout = undefined;
      if (isDisposed) return;
      if (shouldAskIntent(getFrictionLevel())) {
        showIntentSelectionAfterOverlayTransition();
      } else {
        showTimeSelectionAfterOverlayTransition();
      }
      enterRestingForChoices();
    }, QUESTION_FADE_OUT_MS);
  };

  // The choices (and their reserved sun slot) are mounting now. Measure the slot
  // on the next frame, then flip to resting, so the disc glides straight to its
  // spot in one motion rather than detouring via the static fallback (down, then
  // back up). Clearing the advancing flag only after the resting phase is set
  // keeps the sun continuously visible across the hand-off.
  const enterRestingForChoices = () => {
    requestAnimationFrame(() => {
      if (isDisposed) return;
      measureRestingSunAnchor({ force: true });
      setSunPhase("resting");
      setIsAdvancingToChoices(false);
    });
  };

  const handleBreathPauseComplete = () => {
    if (isDisposed) return;
    clearIntentSelectionArmTimeout();
    // Drop the breath origin now the pause is over, so a re-opened pause glides
    // in and re-publishes a fresh clock rather than reading this stale one.
    setBreathStartedAt(undefined);
    setShowBreathPause(false);
    setIsIntentSelectionArmed(true);
    setShowIntentSelection(true);
    // Same one-motion hand-off as the no-breath path: the sun stays visible as
    // "breathing" for the one frame until the slot is measured, then glides to it.
    enterRestingForChoices();
  };

  const handleBreathPauseCancel = () => {
    cancelCountdown();
    setPendingIntent(undefined);
    setBreathStartedAt(undefined);
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
    lastCompletionDirection = direction;
    setIsFinalAnimation(true);

    // Direction picks the ritual on the dashboard, instead of completing.
    //
    // Down = ground yourself: the "Stay a while?" offer takes over with its own
    // full-screen, opaque layer that the drag's warm sky carries *into*
    // (--background-sunset-gradient), so the hand-off from the drag reads as one
    // continuous motion — no flash. But "Stay a while" is a place to rest, not a
    // sunset to dwell in: once the offer has landed it eases that carried-in wash
    // back to the dashboard's calm sky (see GroundingOverlay's skySettled). We
    // also ease the transition background beneath it home, so any peek on close
    // is the default sky rather than a frozen sunset.
    //
    // Unlike let-go (which hides the sun behind its question), the sun stays with
    // the offer rather than vanishing: settle it to its companion rest at the
    // bottom so it rests beneath the invitation, visible on the shell-sun layer
    // above the offer's sky. (The down-drag's own completion would otherwise
    // slide the disc off the bottom edge and fade it out.) From there it carries
    // the whole stage as the one sun: it rises into the centre and breathes for a
    // timed sit, and tucks away only for a screen-free sit / Android lock — so
    // there's never two suns at once; see GroundingOverlay's onSunMode.
    if (props.isFromDashboard && direction === "down") {
      runFadeAnimation(ANIMATION_TIMING.fadeOut.standard, () => undefined);
      // Ease the transition background home only *after* the offer has faded in
      // and gone opaque (GROUNDING_FADE_MS). The offer carries the drag's sunset
      // and dissolves it back to standard itself; resetting the layer beneath it
      // *now* — while the offer is still translucent over it — would race the
      // offer's slow settle and make the sky dip toward standard then bounce back
      // toward sunset mid-fade. Once the offer is opaque this reset is hidden, so
      // it only matters for the close fade (where it must reveal the default sky,
      // never a frozen sunset).
      groundingBgResetTimeout = window.setTimeout(() => {
        groundingBgResetTimeout = undefined;
        if (isDisposed) return;
        interactionEventTarget.dispatchEvent(
          new CustomEvent("resetBackgroundTransition"),
        );
      }, GROUNDING_FADE_MS);
      setSunPhase("companion");
      setShowGroundingOffer(true);
      return;
    }

    // Up/away = let go: the disc is flung off and the "What do you want to let go
    // of?" question takes over. It should read like any other question screen, so
    // (a) reset the background to its neutral default rather than completing to
    // the cold "night" extreme the up-drag was heading toward — the transparent
    // let-go overlay shows that standard background through — and (b) hide the
    // shell sun while the question is up. The sun is its own layer above this
    // overlay, so leaving it visible would let it career across the question and
    // pop back in on top; hidden here, it is sent home and revealed on close.
    if (props.isFromDashboard && direction === "up") {
      runFadeAnimation(ANIMATION_TIMING.fadeOut.standard, () => undefined);
      interactionEventTarget.dispatchEvent(
        new CustomEvent("dragProgress", {
          detail: {
            direction: "none",
            intensity: 0,
            isDragging: false,
            resetToInitial: true,
          },
        }),
      );
      if (props.useShellSun) setIsShellSunHidden(true);
      setShowLetGoOffer(true);
      return;
    }

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
    // A deferred success (an interaction that saves asynchronously) can land after
    // the user triple-tapped past the question to the choices. The answer is already
    // saved by the caller; acting on it here would disarm the choices without
    // re-arming or advancing them, freezing them with every button greyed.
    if (
      shouldIgnoreStaleSuccess({
        hasAnswered: getHasAnswered(),
        showSunInstructions: getShowSunInstructions(),
        showPostSunOverlay: getShowPostSunOverlay(),
      })
    ) {
      return;
    }

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
    } else if (resetToInitial && !getIsFinalAnimation()) {
      // resetToInitial normally means a sub-threshold drag snapped back, so the
      // dimmed content returns to full opacity. But the let-go open *also*
      // dispatches resetToInitial (to reset the sky to neutral) while it is
      // deliberately fading the content out — guard on isFinalAnimation so this
      // listener doesn't fight that fade by popping the content back to opaque.
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
      onFlingAway: () => runTerminalOutcome(props.onFlingAway),
      onDragComplete: () => runTerminalOutcome(props.onDragComplete),
      onStartBackgroundAnimation: handleStartBackgroundAnimation,
      onCompletionStarted: (started) => {
        setIsCompletionStarted(started);
        props.onCompletionStarted?.(started);
      },
      tapThreshold: SUN_TAP_THRESHOLD,
      // Shown from inside the app (not a real intervention): the triple-tap
      // continue makes no sense here — a back button is shown instead.
      isTapEnabled: !props.isFromDashboard,
    });
    onCleanup(unregister);
  });

  // Publish the placeholder's live centre so the shell sun rests there. Re-measure
  // on any reflow (answers/mode change, the async question load) and on resize;
  // the disc glides to the new centre automatically (the settle tracks it). Skip
  // mid-drag so a stray reflow can't yank the disc out from under the user.
  const measureSunPlaceholder = () => {
    if (!sunPlaceholderEl || getIsDragging()) return;
    const rect = sunPlaceholderEl.getBoundingClientRect();
    setInteractiveSunAnchor({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  onMount(() => {
    if (!props.useShellSun || !sunPlaceholderEl) return;
    // Measure the slot first, *then* flip the role: the disc rises out of the
    // companion straight onto its placeholder in one slow glide (no detour via
    // the base while the anchor is still unmeasured).
    requestAnimationFrame(() => {
      measureSunPlaceholder();
      setSunRole("interactive");
    });
    // Observe the content box (not the fixed-height placeholder): its reflow is
    // what shifts the slot's position. The placeholder's own size only changes at
    // the media breakpoints, which the resize listener already covers.
    const box = document.getElementById("minded-6622-interaction-wrapper-box");
    if (box) {
      sunPlaceholderObserver = new ResizeObserver(() =>
        measureSunPlaceholder(),
      );
      sunPlaceholderObserver.observe(box);
    }
    window.addEventListener("resize", measureSunPlaceholder);
    onCleanup(() => {
      sunPlaceholderObserver?.disconnect();
      window.removeEventListener("resize", measureSunPlaceholder);
      // Drop the anchor so a later phase / the next open re-measures from scratch.
      setInteractiveSunAnchor(null);
    });
  });

  // Resting sun: measure the live choices block (question + options) and publish
  // a centre just beneath it so the disc tucks under whatever options are showing
  // — the 4-option intent screen or the taller 6-option time screen — and glides
  // down when they swap. Skip mid-drag so a reflow can't yank the disc.
  // `force` measures even before the phase flips to "resting", so the anchor is
  // ready when the glide starts and the disc moves to its slot in one motion
  // (used as the choices mount; see handleBreathPauseComplete).
  const measureRestingSunAnchor = (opts?: { force?: boolean }) => {
    if ((!opts?.force && getSunPhase() !== "resting") || getIsDragging())
      return;
    // Reduced motion has no glide to track the slot, and the snap from the static
    // fallback to a measured px anchor strands the disc; keep the static rest
    // target (still beneath the intent options) in that mode.
    if (prefersReducedMotion()) {
      setRestingSunAnchor(null);
      return;
    }
    const spacer = restingOverlayEl?.querySelector(".resting-sun-spacer");
    if (!spacer) return;
    setRestingSunAnchor(
      restingSunAnchorFromRect(spacer.getBoundingClientRect()),
    );
  };

  // Re-measure when the choices mount and when intent↔time swaps the option
  // count; clear the anchor when the choices leave so the resting role falls back
  // to the static target and other phases keep their own settle.
  createEffect(() => {
    const overlayShown = getShowTimeSelectionOverlay();
    const intentShown = getShowIntentSelection();
    const timeShown = getShowTimeSelection();
    const isResting = getSunPhase() === "resting";
    if (!overlayShown || !isResting || (!intentShown && !timeShown)) {
      setRestingSunAnchor(null);
      return;
    }
    // Measure after layout so the just-mounted choices have their final position.
    requestAnimationFrame(() => measureRestingSunAnchor());
  });

  onMount(() => {
    const onResize = () => measureRestingSunAnchor();
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      window.removeEventListener("resize", onResize);
      restingSunObserver?.disconnect();
      setRestingSunAnchor(null);
    });
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
          // Remember what we opened with so the next intervention can avoid
          // repeating it (one-deep memory; see getInteractionMode's fallback).
          // Fire-and-forget: it must not delay showing the pause.
          void markInteractionModeShown(modeDecision.mode).catch(
            (error: unknown) =>
              console.error("Failed to record interaction mode", error),
          );
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

    // Reset the shared breath origin so the next interaction's pause starts from
    // a fresh clock rather than this one's stale timestamp.
    setBreathStartedAt(undefined);

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
    if (groundingBgResetTimeout) {
      clearTimeout(groundingBgResetTimeout);
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
      />

      {getShowBeProudMessage() && <div class="be-proud-message">Be proud!</div>}

      {getShowGroundingOffer() && (
        <GroundingOverlay
          variant={getDragObjectName()}
          onClose={finishGrounding}
          onSunMode={
            // The one shell sun carries the whole grounding stage rather than a
            // second disc being drawn (only wired when the shell sun exists; the
            // grounding offer only opens on the shell-sun dashboard anyway):
            //  - "companion": rest on / glide home to the bottom bar (beneath the
            //    invitation, and beneath the closing praise).
            //  - "meditate": rise into the centre and breathe as the timed sit's
            //    breath sun. Reuse the "surfing" role so the sit breathes with the
            //    same gentle meditation pulse the urge-surf wave uses, gliding up
            //    from the companion rest — one sun, morphing, never a second disc.
            //  - "hidden": tuck away while a screen-free sit / Android lock owns
            //    the near-black screen. (Snap-hide, per the shell-sun layer.)
            props.useShellSun
              ? (mode) => {
                  if (mode === "hidden") {
                    // Send it home first so it's at its companion rest when the
                    // close reveals it again, then hide it behind the dim.
                    setSunPhase("companion");
                    setIsShellSunHidden(true);
                    return;
                  }
                  setIsShellSunHidden(false);
                  setSunPhase(mode === "meditate" ? "surfing" : "companion");
                }
              : undefined
          }
        />
      )}

      {getShowLetGoOffer() && (
        <LetGoOverlay answers={getAnswers()} onClose={finishLetGo} />
      )}

      {getShowTimeSelectionOverlay() && (
        <div
          class="time-selection-overlay"
          classList={{ "has-resting-sun": getSunPhase() === "resting" }}
          ref={(el) => {
            restingOverlayEl = el;
            restingSunObserver?.disconnect();
            if (el) {
              // Observe the overlay so the choices reflow inside it (intent↔time,
              // async copy) re-measures the slot. The observer also fires once on
              // observe() — after layout, with the overlay attached — which is the
              // initial measurement (a synchronous read here would see a
              // detached, zero-size element).
              restingSunObserver = new ResizeObserver(() =>
                measureRestingSunAnchor(),
              );
              restingSunObserver.observe(el);
            }
          }}
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
            // Hand-off in progress: make the faded question click-through so the
            // choices above it (and their hovers) receive the pointer.
            "is-dismissed":
              getShowPostSunOverlay() || getIsExitingInteraction(),
          }}
          style={{
            opacity:
              getIsExitingInteraction() || getShowPostSunOverlay()
                ? 0
                : getShowSunInstructions()
                  ? 0
                  : getInteractionOpacity(),
            // Swap blocks instantly (no fade-out) during a mode change; fade the
            // question out quickly when advancing past it (triple tap).
            transition: getIsContentSwapInstant()
              ? "none"
              : getIsExitingInteraction() || getShowPostSunOverlay()
                ? `opacity ${QUESTION_FADE_OUT_MS}ms ease-out`
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
            frictionLevel={getFrictionLevel()}
            syncData={getSyncDataI()}
            initialQuestion={getInitialQuestion()}
            answers={getAnswers()}
            targetName={displayTargetName(props.interactionTarget)}
            patternInsight={getPatternInsight()}
            onCancelCountdown={cancelCountdown}
            onSuccess={onInteractionSuccess}
            onSkip={handleSkip}
            onLeaveNow={props.onFlingAway}
            onSunWaveStart={startSunWave}
            onSunWaveEnd={endSunWave}
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

        {/* Reserves the shell sun's footprint in the content flow so the answers
            sit directly above the disc as one centred group; the sun is measured
            to this slot's centre and rests there (see measureSunPlaceholder). */}
        {props.useShellSun && (
          <div
            ref={sunPlaceholderEl}
            class="shell-sun-placeholder"
            aria-hidden="true"
          />
        )}

        {/* Sun instructions overlay — see shouldShowSunInstructionsOverlay for
            why it unmounts once the post-sun choices/breath overlay is up. */}
        {shouldShowSunInstructionsOverlay({
          showSunInstructions: getShowSunInstructions(),
          isCompletionStarted: getIsCompletionStarted(),
          showPostSunOverlay: getShowPostSunOverlay(),
          isFromDashboard: !!props.isFromDashboard,
        }) && (
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
              // Match the question's quick fade-out when advancing past it.
              transition:
                getIsExitingInteraction() || getShowPostSunOverlay()
                  ? `opacity ${QUESTION_FADE_OUT_MS}ms ease-out`
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
              // Draggable only during the live interaction — not once the gesture
              // is done and we're advancing/exiting (the disc is just gliding).
              "pointer-events":
                getIsInteractionSunShown() &&
                getSunPhase() === "interactive" &&
                !getIsExitingInteraction()
                  ? "all"
                  : "none",
            }}
          >
            <Sun
              variant={getDragObjectName()}
              onSkip={handleSunContinue}
              onFlingAway={() => runTerminalOutcome(props.onFlingAway)}
              onDragComplete={() => runTerminalOutcome(props.onDragComplete)}
              onStartBackgroundAnimation={handleStartBackgroundAnimation}
              onCompletionStarted={(started) => {
                setIsCompletionStarted(started);
                props.onCompletionStarted?.(started);
              }}
              eventRoot={props.shadowRoot}
              tapThreshold={SUN_TAP_THRESHOLD}
              isTapEnabled={!props.isFromDashboard}
              settle={getSunSettle()}
              onBreathStart={setBreathStartedAt}
            />
          </div>
        )}
      </div>

      {props.isFromDashboard && !getShowLetGoOffer() && (
        <div class="back-button-wrapper">
          <Btn
            variant="icon"
            plain
            onClick={() => props.onSkip()}
            aria-label="Go back"
          >
            <Ico name="arrowBack" />
          </Btn>
        </div>
      )}
    </>
  );
};

export default InteractionCommon;

import {
  Component,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import {
  DRAG_THRESHOLD_PX,
  VELOCITY_SAMPLE_SIZE,
  LONG_PRESS_DURATION_MS,
  HAPTIC_PROGRESS_POINTS,
  FLING_ANIMATION_CONFIG,
  COMPLETION_ANIMATION_CONFIG,
  calculateVelocity,
  updatePhysics,
  calculateDragEffects,
  easeInOut,
  easeOutBack,
  triggerHaptic,
  triggerHapticPattern,
  applyRubberBanding,
  getSunSize,
  hasVerticalCompletionIntent,
  getSunReleaseAction,
  calculateDragColorTemperature,
  type VelocitySample,
  type PhysicsState,
  type SunDragDirection,
} from "./sunAnimationUtils";
import { playCompletionSound } from "./sunAudio";

type SunPosition = {
  x: number;
  y: number;
};

interface SunProps {
  onSkip: () => void;
  onFlingAway: () => void;
  onDragComplete: () => void;
  onStartBackgroundAnimation?: (direction: "up" | "down") => void;
  onCompletionStarted?: (started: boolean) => void;
  eventRoot?: ShadowRoot;
  /**
   * Opt-in live position sink. When provided (the shell sun), the sun's center
   * is pushed here every frame *instead of* dispatching the `sunPositionChanged`
   * window event, so a consumer can read it from a signal off the event bus.
   */
  onPositionChange?: (position: SunPosition) => void;
  /**
   * Opt-in for a permanently-mounted sun (the shell sun): keep box-shadow out of
   * `will-change` so the browser doesn't hold a compositor-layer hint alive for
   * the app's lifetime (box-shadow can't be GPU-composited anyway). The old
   * CompanionSun did exactly this.
   */
  minimizeWillChange?: boolean;
  tapThreshold?: number;
  isTapEnabled?: boolean;
  isDragEnabled?: boolean;
  variant?: "sun" | "moon";
  completionDirection?: "any" | "down";
  /**
   * Post-interaction resting state. When set, the sun glides to a viewport
   * anchor and holds there (optionally breathing) instead of being hidden —
   * the same element transforms across the breath pause and the intent/time
   * choices, so it is never swapped out. null returns it to its interactive
   * position.
   */
  settle?: SunSettle | null;
}

export interface SunSettle {
  /** Vertical resting point as a fraction of viewport height (0 = top). */
  anchorYRatio?: number;
  /**
   * Fixed horizontal resting point in px from the left edge (x is centered when
   * omitted). Use to land on a fixed-px element (the Little Sun corner) so the
   * two don't drift apart on wide viewports.
   */
  anchorXPx?: number;
  /**
   * Fixed vertical resting point in px from the bottom edge. Overrides
   * anchorYRatio when set. Used to land on the bottom-bar companion anchor
   * (--companion-bar-center-y) without drifting on tall viewports.
   */
  anchorYPxFromBottom?: number;
  /**
   * Fixed vertical resting point in px from the top edge. Overrides anchorYRatio
   * (but not anchorYPxFromBottom). Provided as the mirror of anchorYPxFromBottom
   * for any future top-anchored settle.
   */
  anchorYPxFromTop?: number;
  /** Resting scale relative to the sun's base size. */
  scale?: number;
  /** Run one slow inhale→exhale while settled. */
  breathe?: boolean;
  /** Length of the inhale→exhale in seconds. */
  breathSeconds?: number;
}

export const Sun: Component<SunProps> = (props) => {
  let sunEl: HTMLDivElement;
  const [getDragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [getOpacity, setOpacity] = createSignal(1);
  const [getScale, setScale] = createSignal(1);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getIsPointerOver, setIsPointerOver] = createSignal(false);
  const [getIsAnimating, setIsAnimating] = createSignal(false);
  const [getTapCount, setTapCount] = createSignal(0);
  const [getDragProgress, setDragProgress] = createSignal(0);
  const [getDragDirection, setDragDirection] = createSignal<
    "up" | "down" | "none"
  >("none");
  const [getIsBeyondThreshold, setIsBeyondThreshold] = createSignal(false);
  const [getIsCompletionStarted, setIsCompletionStarted] = createSignal(false);
  const [getRotation, setRotation] = createSignal(0);
  const [getGlowIntensity, setGlowIntensity] = createSignal(0);
  const [getColorTemp, setColorTemp] = createSignal(0); // -1 = cool (up), 0 = neutral (down/none)
  const isTapEnabled = () => props.isTapEnabled ?? true;
  const isDragEnabled = () => props.isDragEnabled ?? true;
  const dispatchInteractionEvent = (name: string, detail: unknown) => {
    const event = new CustomEvent(name, { detail });
    (props.eventRoot ?? window).dispatchEvent(event);
  };

  let tapTimer: number | null = null;
  let startPos = { x: 0, y: 0 };
  let animationFrame: number;
  let velocitySamples: VelocitySample[] = [];
  let longPressTimer: number | null = null;
  let resizeHandler: (() => void) | null = null;
  let initialPositionTimeouts: number[] = [];
  let settleFrame: number | undefined;

  // Store event handler references for cleanup
  let touchStartHandler: EventListener | null = null;
  let touchMoveHandler: EventListener | null = null;
  let touchEndHandler: EventListener | null = null;
  let mouseDownHandler: EventListener | null = null;

  onMount(() => {
    // Pre-initialize transform to eliminate initial jaggedness
    // This forces the browser to create the transform matrix early
    if (sunEl) {
      sunEl.style.transform = "translate(0px, 0px) scale(1)";
      // Ensure we include box-shadow to avoid jank — except for a permanently
      // mounted sun, where holding a box-shadow layer hint alive isn't worth it.
      sunEl.style.willChange = props.minimizeWillChange
        ? "transform"
        : "transform, box-shadow";
      // Force a reflow to ensure the transform is applied
      sunEl.offsetHeight;

      // If we mount already in a settled role (the shell companion rests in the
      // top bar from the first paint), snap straight to it — no glide. The
      // settle effect is deferred, so it only animates later role changes.
      // Suppress the CSS transform-transition for this frame; otherwise the
      // jump from the base (centre) to the anchor would glide in over 160ms on
      // load. Restore the transition next frame so later moves still ease.
      if (props.settle) {
        setIsAnimating(true);
        setDragOffset(getAnchorOffset(props.settle));
        setScale(props.settle.scale ?? DEFAULT_REST_SCALE);
        requestAnimationFrame(() => setIsAnimating(false));
      }

      const dispatchAfterLayout = () => {
        requestAnimationFrame(() => dispatchSunPosition());
      };
      dispatchAfterLayout();
      initialPositionTimeouts = [120, 360, 720].map((delay) =>
        window.setTimeout(dispatchAfterLayout, delay),
      );
    }

    resizeHandler = () => {
      requestAnimationFrame(() => dispatchSunPosition());
    };
    window.addEventListener("resize", resizeHandler);

    setupDragHandlers();
  });

  onCleanup(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    cancelSettleFrame();
    if (tapTimer) {
      clearTimeout(tapTimer);
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }
    initialPositionTimeouts.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });

    // Clean up event listeners
    if (sunEl) {
      if (touchStartHandler) {
        sunEl.removeEventListener("touchstart", touchStartHandler);
      }
      if (touchMoveHandler) {
        sunEl.removeEventListener("touchmove", touchMoveHandler);
      }
      if (touchEndHandler) {
        sunEl.removeEventListener("touchend", touchEndHandler);
      }
      if (mouseDownHandler) {
        sunEl.removeEventListener("mousedown", mouseDownHandler);
      }
    }
  });

  const getSunCenterForOffset = (
    offset = getDragOffset(),
  ): SunPosition | undefined => {
    if (!sunEl) return undefined;

    const rect = sunEl.getBoundingClientRect();
    const currentOffset = getDragOffset();

    return {
      x: rect.left + rect.width / 2 - currentOffset.x + offset.x,
      y: rect.top + rect.height / 2 - currentOffset.y + offset.y,
    };
  };

  const dispatchSunPosition = (position = getSunCenterForOffset()) => {
    if (!position) return;

    if (props.onPositionChange) {
      // Shell sun: position flows through the store; skip the window event so we
      // don't double-drive consumers (and no global event leaks per frame).
      props.onPositionChange(position);
    } else {
      dispatchInteractionEvent("sunPositionChanged", { sunPosition: position });
    }
  };

  // --- Post-interaction settle: the sun stays on screen and transforms across
  // the breath pause and the intent/time choices instead of being hidden and
  // replaced by a separate sun. ---
  const GLIDE_DURATION_MS = 650;
  const BREATH_PEAK_BONUS = 0.22; // inhale grows the rest scale by this much
  const DEFAULT_ANCHOR_Y_RATIO = 0.4;
  const DEFAULT_REST_SCALE = 0.82;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cancelSettleFrame = () => {
    if (settleFrame) {
      cancelAnimationFrame(settleFrame);
      settleFrame = undefined;
    }
  };

  // Offset that places the sun's center on a resting anchor. The anchor is a
  // fraction of viewport width/height (x defaults to centered), unless a fixed
  // px anchor is given — px wins so the sun can land exactly on a fixed-px
  // element (the Little Sun corner) without drifting on wide viewports.
  const getAnchorOffset = (settle: SunSettle): SunPosition => {
    const rest = getSunCenterForOffset({ x: 0, y: 0 });
    if (!rest) return getDragOffset();
    const anchorX = settle.anchorXPx ?? window.innerWidth * 0.5;
    const anchorY =
      settle.anchorYPxFromBottom != null
        ? window.innerHeight - settle.anchorYPxFromBottom
        : settle.anchorYPxFromTop != null
          ? settle.anchorYPxFromTop
          : window.innerHeight *
            (settle.anchorYRatio ?? DEFAULT_ANCHOR_Y_RATIO);
    return { x: anchorX - rest.x, y: anchorY - rest.y };
  };

  // Ease the offset and scale toward a target, dispatching the sun's position
  // each frame so the background's warm light glides along with it.
  const animateOffsetScaleTo = (
    targetOffset: SunPosition,
    targetScale: number,
    duration: number,
    onDone?: () => void,
  ) => {
    setIsAnimating(true); // suppress the CSS transform-transition while JS drives it
    const startOffset = getDragOffset();
    const startScale = getScale();
    // The rest center is invariant during the glide — read the rect once here
    // rather than every frame (the per-frame read forced a layout reflow).
    const baseCenter = getSunCenterForOffset({ x: 0, y: 0 });
    const startTime = Date.now();

    const step = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const eased = easeInOut(progress);
      const offset = {
        x: startOffset.x + (targetOffset.x - startOffset.x) * eased,
        y: startOffset.y + (targetOffset.y - startOffset.y) * eased,
      };
      setDragOffset(offset);
      setScale(startScale + (targetScale - startScale) * eased);
      if (baseCenter) {
        dispatchSunPosition({
          x: baseCenter.x + offset.x,
          y: baseCenter.y + offset.y,
        });
      }

      if (progress < 1) {
        settleFrame = requestAnimationFrame(step);
      } else {
        settleFrame = undefined;
        onDone?.();
      }
    };

    cancelSettleFrame();
    settleFrame = requestAnimationFrame(step);
  };

  // One slow inhale→exhale over the pause, peaking at the midpoint — matching
  // the cue copy that flips from "Breathe in" to "Breathe out" halfway through.
  const startBreathCycle = (restScale: number, seconds: number) => {
    const durationMs = Math.max(1, seconds) * 1000;
    const peak = restScale + BREATH_PEAK_BONUS;
    const startTime = Date.now();

    const step = () => {
      const t = Math.min((Date.now() - startTime) / durationMs, 1);
      const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
      setScale(restScale + (peak - restScale) * wave);

      if (t < 1) {
        settleFrame = requestAnimationFrame(step);
      } else {
        settleFrame = undefined;
        setScale(restScale);
        setIsAnimating(false);
      }
    };

    cancelSettleFrame();
    settleFrame = requestAnimationFrame(step);
  };

  const enterSettle = (settle: SunSettle) => {
    setIsDragging(false);
    const restScale = settle.scale ?? DEFAULT_REST_SCALE;
    const target = getAnchorOffset(settle);

    if (prefersReducedMotion()) {
      cancelSettleFrame();
      setDragOffset(target);
      setScale(restScale);
      dispatchSunPosition(getSunCenterForOffset(target));
      setIsAnimating(false);
      return;
    }

    animateOffsetScaleTo(target, restScale, GLIDE_DURATION_MS, () => {
      if (settle.breathe) {
        startBreathCycle(restScale, settle.breathSeconds ?? 7);
      } else {
        setIsAnimating(false);
      }
    });
  };

  const exitSettle = () => {
    cancelSettleFrame();
    if (prefersReducedMotion()) {
      setDragOffset({ x: 0, y: 0 });
      setScale(1);
      dispatchSunPosition(getSunCenterForOffset({ x: 0, y: 0 }));
      setIsAnimating(false);
      return;
    }
    animateOffsetScaleTo({ x: 0, y: 0 }, 1, 500, () => setIsAnimating(false));
  };

  // Re-settle when the target changes (phases map to stable settle objects, so
  // identity tracks "did the target change"). `on` keeps the per-frame writes
  // inside enter/exitSettle from re-triggering this; `defer` skips the initial
  // interactive/null state so no spurious glide fires on mount.
  createEffect(
    on(
      () => props.settle ?? null,
      (settle, prevSettle) => {
        if (settle === prevSettle) return;
        if (settle) enterSettle(settle);
        else exitSettle();
      },
      { defer: true },
    ),
  );

  const setupDragHandlers = () => {
    if (!sunEl) return;

    let isDragIntent = false;
    let touchStartTime = 0;
    let lastHapticPointIndex = -1;

    // Track pending rAF work so we only process one frame at a time
    let isRafPending = false;
    let latestClientX = 0;
    let latestClientY = 0;
    let allowFinalFrame = false;

    const handleStart = (clientX: number, clientY: number) => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      touchStartTime = Date.now();
      isDragIntent = false;
      startPos = { x: clientX, y: clientY };
      // Initialize last-known position so release without movement doesn't create a fake drag
      latestClientX = clientX;
      latestClientY = clientY;
      // Reset velocity tracking
      velocitySamples = [
        {
          x: clientX,
          y: clientY,
          timestamp: Date.now(),
        },
      ];
      // Immediately set dragging state to disable transitions
      setIsDragging(true);
      // Reset haptic threshold tracking
      lastHapticPointIndex = -1;
      // Start long press timer
      if (isDragEnabled()) {
        startLongPressTimer();
      }
    };

    const applyDragFrame = () => {
      // Abort if drag has ended unless we're flushing a final frame on release
      if (!getIsDragging() && !allowFinalFrame) {
        return;
      }

      const rawDeltaX = latestClientX - startPos.x;
      const rawDeltaY = latestClientY - startPos.y;

      const moveDistance = Math.sqrt(
        rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY,
      );

      // Cancel long press if moved beyond tolerance (10px allows for finger jitter)
      if (moveDistance > 10) {
        cancelLongPressTimer();
      }

      if (moveDistance > 10 && !isDragIntent) {
        isDragIntent = true;
      }

      // Apply rubber-banding for weighted feel
      const deltaX = applyRubberBanding(rawDeltaX);
      const deltaY = applyRubberBanding(rawDeltaY);
      const hasVerticalDragIntent = hasVerticalCompletionIntent({
        x: rawDeltaX,
        y: rawDeltaY,
      });
      const dragDirection: SunDragDirection = hasVerticalDragIntent
        ? deltaY > 0
          ? "down"
          : deltaY < 0
            ? "up"
            : "none"
        : "none";

      // Calculate drag progress and visual effects (use raw values for threshold logic).
      // Horizontal-dominant drags still move the sun, but they do not arm completion.
      const dragDistance = hasVerticalDragIntent ? Math.abs(rawDeltaY) : 0;
      const effects = calculateDragEffects(rawDeltaY, dragDistance);

      // Progressive glow: quadratic ramp from 0-100% of threshold
      const glowProgress = Math.min(dragDistance / DRAG_THRESHOLD_PX, 1);
      setGlowIntensity(glowProgress * glowProgress);

      // Progressive haptics at 33%, 66%, 100% of threshold
      const progressNormalized = dragDistance / DRAG_THRESHOLD_PX;
      const currentPointIndex = HAPTIC_PROGRESS_POINTS.findIndex(
        (point) => progressNormalized < point,
      );
      const effectiveIndex =
        currentPointIndex === -1
          ? HAPTIC_PROGRESS_POINTS.length - 1
          : currentPointIndex - 1;

      if (effectiveIndex > lastHapticPointIndex) {
        // Crossed a new threshold going up
        triggerHaptic(
          effectiveIndex === HAPTIC_PROGRESS_POINTS.length - 1
            ? "medium"
            : "light",
        );
        lastHapticPointIndex = effectiveIndex;
        if (dragDistance >= DRAG_THRESHOLD_PX) {
          setIsBeyondThreshold(true);
        }
      } else if (effectiveIndex < lastHapticPointIndex) {
        // Crossed back down
        lastHapticPointIndex = effectiveIndex;
        if (dragDistance < DRAG_THRESHOLD_PX) {
          setIsBeyondThreshold(false);
        }
      }

      // Batch all state updates together
      setDragOffset({ x: deltaX, y: deltaY });
      setScale(effects.scale);
      setOpacity(effects.opacity);

      // Update progress and direction for visual indicators
      setDragProgress(effects.progress);
      setDragDirection(dragDirection);

      setColorTemp(calculateDragColorTemperature(dragDirection, dragDistance));

      // Track velocity samples
      const now = Date.now();
      velocitySamples.push({
        x: latestClientX,
        y: latestClientY,
        timestamp: now,
      });
      if (velocitySamples.length > VELOCITY_SAMPLE_SIZE) {
        velocitySamples.shift();
      }

      // Only emit drag progress events after drag intent is confirmed
      if (isDragIntent) {
        const intensity = getDragProgress();
        const sunPosition = getSunCenterForOffset({ x: deltaX, y: deltaY });

        dispatchInteractionEvent("dragProgress", {
          direction: dragDirection,
          intensity,
          isDragging: true,
          sunPosition,
        });
      }

      // Reset final-frame allowance so we don't keep processing after release
      allowFinalFrame = false;
    };

    const handleMove = (clientX: number, clientY: number) => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      latestClientX = clientX;
      latestClientY = clientY;

      if (isRafPending) return;

      isRafPending = true;
      requestAnimationFrame(() => {
        isRafPending = false;
        applyDragFrame();
      });
    };

    const handleEnd = () => {
      // Flush the latest movement even if the release happened before the rAF tick
      allowFinalFrame = true;
      applyDragFrame();
      // Capture isDragIntent before resetting - applyDragFrame may have set it
      const wasDragIntent = isDragIntent;
      isDragIntent = false;
      const duration = Date.now() - touchStartTime;
      const offset = getDragOffset();
      const velocity = calculateVelocity(velocitySamples);

      // Cancel long press timer
      cancelLongPressTimer();

      // Always reset dragging state
      setIsDragging(false);
      setDragProgress(0);
      setDragDirection("none");
      // Don't reset beyond threshold here - let it persist during completion animation

      // Don't reset rotation here - let it animate back smoothly

      // Check for tap: no drag intent, short duration, minimal movement
      if (
        !wasDragIntent &&
        duration < 300 &&
        Math.abs(offset.x) < 10 &&
        Math.abs(offset.y) < 10
      ) {
        handleTap();
        return;
      }

      dispatchInteractionEvent("dragProgress", {
        direction: "none",
        intensity: 0,
        isDragging: false,
        sunPosition: getSunCenterForOffset(offset),
      });

      const releaseAction = getSunReleaseAction({
        offset,
        velocity,
        isDragEnabled: isDragEnabled(),
        completionDirection: props.completionDirection,
      });

      if (releaseAction.type === "snapBack") {
        dispatchInteractionEvent("dragProgress", {
          direction: "none",
          intensity: 0,
          isDragging: false,
          resetToInitial: true,
          sunPosition: getSunCenterForOffset({ x: 0, y: 0 }),
        });
        animateSnapBack();
      } else if (releaseAction.type === "fling") {
        // Vertical fling behavior triggers onFlingAway.
        triggerHaptic("medium");
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.(releaseAction.direction);
        animateFling(velocity);
      } else if (releaseAction.type === "dragComplete") {
        // Slow drag behavior (non-fling) - triggers onDragComplete
        triggerHapticPattern("completion"); // Satisfying heavy + light pattern
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.(releaseAction.direction);
        animateToCompletion(releaseAction.direction);
      }
    };

    const handleTap = () => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;
      if (!isTapEnabled()) return;

      const currentTapCount = getTapCount() + 1;
      setTapCount(currentTapCount);

      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }

      const threshold = props.tapThreshold || 5;

      if (currentTapCount >= threshold) {
        props.onSkip();
        setTapCount(0);
      } else {
        tapTimer = window.setTimeout(() => {
          setTapCount(0);
        }, 1500);
      }
    };

    const startLongPressTimer = () => {
      cancelLongPressTimer();
      longPressTimer = window.setTimeout(() => {
        if (getIsCompletionStarted()) return;

        // Long press triggered - lock in and play completion
        triggerHapticPattern("completion"); // Satisfying heavy + light pattern
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.("down");
        // Note: animateToCompletion sets isAnimating=true before we clear isDragging
        // to prevent transition glitch
        animateToCompletion("down");
        setIsDragging(false);
      }, LONG_PRESS_DURATION_MS);
    };

    const cancelLongPressTimer = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const animateSnapBack = () => {
      // Keep transitions disabled while JS drives the snap-back animation
      setIsAnimating(true);
      setIsBeyondThreshold(false); // Reset glow when snapping back
      setGlowIntensity(0); // Reset progressive glow
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();
      const startRotation = getRotation();
      const startGlow = getGlowIntensity();
      const startColorTemp = getColorTemp();

      const duration = 600;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutBack(progress); // Subtle overshoot bounce

        const currentX = startOffset.x * (1 - easedProgress);
        const currentY = startOffset.y * (1 - easedProgress);
        const currentOffset = { x: currentX, y: currentY };
        const sunPosition = getSunCenterForOffset(currentOffset);
        setDragOffset(currentOffset);
        dispatchSunPosition(sunPosition);

        const currentScale = startScale + (1 - startScale) * easedProgress;
        setScale(currentScale);

        const currentOpacity =
          startOpacity + (1 - startOpacity) * easedProgress;
        setOpacity(currentOpacity);

        const currentRotation = startRotation * (1 - easedProgress);
        setRotation(currentRotation);

        // Fade out visual effects during snap-back
        setGlowIntensity(startGlow * (1 - progress));
        setColorTemp(startColorTemp * (1 - progress));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setGlowIntensity(0);
        }
      };

      animate();
    };

    const animateToCompletion = (direction: "up" | "down") => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();

      const config = COMPLETION_ANIMATION_CONFIG;
      const easing =
        direction === "down" ? config.easing.downward : config.easing.upward;
      const targetY =
        direction === "down" ? window.innerHeight : -window.innerHeight;

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / config.duration, 1);
        const easedProgress = easeInOut(progress);

        const currentY =
          startOffset.y + (targetY - startOffset.y) * easedProgress;
        const currentOffset = { x: startOffset.x, y: currentY };
        const sunPosition = getSunCenterForOffset(currentOffset);
        setDragOffset(currentOffset);
        dispatchSunPosition(sunPosition);

        const currentScale =
          startScale + (easing.targetScale - startScale) * easedProgress;
        setScale(currentScale);

        const currentOpacity =
          startOpacity + (easing.targetOpacity - startOpacity) * easedProgress;
        setOpacity(currentOpacity);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          props.onDragComplete();
        }
      };

      animate();
    };

    const animateFling = (velocity: {
      x: number;
      y: number;
      magnitude: number;
    }) => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();

      // Safety check: ensure we have valid initial values
      if (!startOffset || startScale <= 0 || startOpacity <= 0) {
        props.onFlingAway();
        return;
      }

      const config = FLING_ANIMATION_CONFIG;
      const screenDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Initialize physics state
      let physicsState: PhysicsState = {
        position: { x: startOffset.x, y: startOffset.y },
        velocity: { x: velocity.x, y: velocity.y },
        rotation: 0,
        scale: startScale,
        opacity: startOpacity,
      };

      const startTime = Date.now();
      let lastTime = startTime;

      const animate = () => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000; // Delta time in seconds
        lastTime = now;
        const elapsedTime = now - startTime;

        // Update physics
        physicsState = updatePhysics(
          physicsState,
          config,
          dt,
          startOffset,
          startScale,
          startOpacity,
          screenDimensions,
        );

        // Apply state to UI
        const sunPosition = getSunCenterForOffset(physicsState.position);
        setDragOffset(physicsState.position);
        dispatchSunPosition(sunPosition);
        setScale(physicsState.scale);
        setOpacity(physicsState.opacity);
        setRotation(physicsState.rotation);

        // Animation runs for fixed duration
        const animationComplete = elapsedTime >= config.duration;

        // Complete after fixed duration
        if (animationComplete) {
          setIsAnimating(false);
          props.onFlingAway();
        } else {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animate();
    };

    // Store handlers for cleanup
    touchStartHandler = ((e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }) as EventListener;

    touchMoveHandler = ((e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }) as EventListener;

    touchEndHandler = ((e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleEnd();
    }) as EventListener;

    mouseDownHandler = ((e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const handleMouseUp = () => {
        handleEnd();
        eventTarget.removeEventListener(
          "mousemove",
          handleMouseMove as EventListener,
        );
        eventTarget.removeEventListener(
          "mouseup",
          handleMouseUp as EventListener,
        );
      };

      // Use shadow root if available, otherwise fall back to document
      const eventTarget: EventTarget = props.eventRoot || document;
      eventTarget.addEventListener(
        "mousemove",
        handleMouseMove as EventListener,
      );
      eventTarget.addEventListener("mouseup", handleMouseUp as EventListener);
    }) as EventListener;

    sunEl.addEventListener("touchstart", touchStartHandler);
    sunEl.addEventListener("touchmove", touchMoveHandler);
    sunEl.addEventListener("touchend", touchEndHandler);
    sunEl.addEventListener("mousedown", mouseDownHandler);
  };

  const sunSize = getSunSize(window.innerWidth);

  // Reactive glow color based on upward drag color temperature
  const getGlowColor = () => {
    const ct = getColorTemp();
    return ct < -0.1 ? "200, 220, 255" : "255, 255, 255";
  };
  const getInteractionScale = () => {
    if (getIsCompletionStarted()) {
      return 1;
    }

    if (getIsDragging()) {
      return 1.06;
    }

    return getIsPointerOver() ? 1.04 : 1;
  };

  return (
    <div
      ref={sunEl!}
      class="minded-sun"
      classList={{
        dragging: getIsDragging(),
        moon: props.variant === "moon",
      }}
      onMouseEnter={() => setIsPointerOver(true)}
      onMouseLeave={() => setIsPointerOver(false)}
      style={{
        transform: `translate(${getDragOffset().x}px, ${getDragOffset().y}px) scale(${sunSize.baseScale * getScale() * getInteractionScale()}) rotate(${getRotation()}deg)`,
        opacity: getOpacity(),
        transition:
          getIsDragging() || getIsAnimating()
            ? "none"
            : "transform 160ms ease-out, opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        width: `${sunSize.size}px`,
        height: `${sunSize.size}px`,
        "--glow-color": getGlowColor(),
        "--glow-intensity": getGlowIntensity(),
        "--sun-warmth": Math.max(0, getColorTemp()),
      }}
    >
      {isTapEnabled() && (
        <div class="tap-indicator" classList={{ active: getTapCount() > 0 }}>
          {Array.from({ length: props.tapThreshold || 5 }).map((_, i) => (
            <div
              class="tap-dot"
              classList={{ filled: i + 1 <= getTapCount() }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sun;

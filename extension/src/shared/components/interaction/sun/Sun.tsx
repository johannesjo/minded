import { Component, createSignal, onCleanup, onMount } from "solid-js";
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
  type VelocitySample,
  type PhysicsState,
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
  tapThreshold?: number;
  isTapEnabled?: boolean;
  isDragEnabled?: boolean;
  variant?: "sun" | "moon";
  completionDirection?: "any" | "down";
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
  const [getColorTemp, setColorTemp] = createSignal(0); // -1 = cool (up), 1 = warm (down)
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
      // Ensure we include box-shadow to avoid jank
      sunEl.style.willChange = "transform, box-shadow";
      // Force a reflow to ensure the transform is applied
      sunEl.offsetHeight;

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

    dispatchInteractionEvent("sunPositionChanged", { sunPosition: position });
  };

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
      const dragDirection = hasVerticalDragIntent
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

      // Color temperature: cool (blue) when dragging up, warm (orange) when down
      const normalizedProgress = dragDistance / DRAG_THRESHOLD_PX;
      const tempIntensity = Math.min(normalizedProgress, 1);
      setColorTemp(
        dragDirection === "down"
          ? tempIntensity
          : dragDirection === "up"
            ? -tempIntensity
            : 0,
      );

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
      // console.log("Sun tap:", currentTapCount, "threshold:", threshold);

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

  // Reactive glow color based on drag color temperature
  const getGlowColor = () => {
    const ct = getColorTemp();
    return ct > 0.1
      ? "255, 200, 100"
      : ct < -0.1
        ? "200, 220, 255"
        : "255, 255, 255";
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

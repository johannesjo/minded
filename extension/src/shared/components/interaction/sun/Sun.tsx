import { Component, createSignal, onMount } from "solid-js";
import "./Sun.scss";
import {
  DRAG_THRESHOLD_PX,
  FLING_VELOCITY_THRESHOLD,
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
  type VelocitySample,
  type PhysicsState,
} from "./sunAnimationUtils";
import { playCompletionSound } from "./sunAudio";

interface SunProps {
  onSkip: () => void;
  onFlingAway: () => void;
  onDragComplete: () => void;
  onStartBackgroundAnimation?: (direction: "up" | "down") => void;
  onCompletionStarted?: (started: boolean) => void;
  eventRoot?: ShadowRoot;
}

export const Sun: Component<SunProps> = (props) => {
  let sunEl: HTMLDivElement;
  const [getDragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [getOpacity, setOpacity] = createSignal(1);
  const [getScale, setScale] = createSignal(1);
  const [getIsDragging, setIsDragging] = createSignal(false);
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
  const [getVelocityMagnitude, setVelocityMagnitude] = createSignal(0);

  let tapTimer: number | null = null;
  let startPos = { x: 0, y: 0 };
  let animationFrame: number;
  let velocitySamples: VelocitySample[] = [];
  let longPressTimer: number | null = null;

  onMount(() => {
    // Pre-initialize transform to eliminate initial jaggedness
    // This forces the browser to create the transform matrix early
    if (sunEl) {
      sunEl.style.transform = "translate(0px, 0px) scale(1)";
      sunEl.style.willChange = "transform, box-shadow";
      // Force a reflow to ensure the transform is applied
      sunEl.offsetHeight;
    }

    setupDragHandlers();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (tapTimer) {
        clearTimeout(tapTimer);
      }
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  });

  const setupDragHandlers = () => {
    if (!sunEl) return;

    let isDragIntent = false;
    let touchStartTime = 0;
    let lastHapticPointIndex = -1;

    const handleStart = (clientX: number, clientY: number) => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      touchStartTime = Date.now();
      isDragIntent = false;
      startPos = { x: clientX, y: clientY };
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
      startLongPressTimer();
    };

    const handleMove = (clientX: number, clientY: number) => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      const rawDeltaX = clientX - startPos.x;
      const rawDeltaY = clientY - startPos.y;

      const moveDistance = Math.sqrt(
        rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY,
      );

      // Cancel long press if moved beyond tolerance (10px allows for finger jitter)
      if (moveDistance > 10) {
        cancelLongPressTimer();
      }

      if (moveDistance > 2 && !isDragIntent) {
        isDragIntent = true;
      }

      // Apply rubber-banding for weighted feel
      const deltaX = applyRubberBanding(rawDeltaX);
      const deltaY = applyRubberBanding(rawDeltaY);

      // Calculate drag progress and visual effects (use raw values for threshold logic)
      const dragDistance = Math.abs(rawDeltaY);
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
      setDragDirection(deltaY > 0 ? "down" : deltaY < 0 ? "up" : "none");

      // Color temperature: cool (blue) when dragging up, warm (orange) when down
      const normalizedProgress = dragDistance / DRAG_THRESHOLD_PX;
      const tempIntensity = Math.min(normalizedProgress, 1);
      setColorTemp(rawDeltaY > 0 ? tempIntensity : -tempIntensity);

      // Track velocity samples
      const now = Date.now();
      velocitySamples.push({ x: clientX, y: clientY, timestamp: now });
      if (velocitySamples.length > VELOCITY_SAMPLE_SIZE) {
        velocitySamples.shift();
      }

      // Calculate current velocity for motion blur
      const currentVelocity = calculateVelocity(velocitySamples);
      setVelocityMagnitude(currentVelocity.magnitude);

      // Only emit drag progress events after drag intent is confirmed
      if (isDragIntent) {
        const direction = deltaY > 0 ? "down" : "up";
        const intensity = getDragProgress();

        const event = new CustomEvent("dragProgress", {
          detail: { direction, intensity, isDragging: true },
        });
        window.dispatchEvent(event);
      }
    };

    const handleEnd = () => {
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

      if (
        !isDragIntent &&
        duration < 300 &&
        Math.abs(offset.x) < 2 &&
        Math.abs(offset.y) < 2
      ) {
        handleTap();
        return;
      }

      const screenHeight = window.innerHeight;

      const clearEvent = new CustomEvent("dragProgress", {
        detail: { direction: "none", intensity: 0, isDragging: false },
      });
      window.dispatchEvent(clearEvent);

      // Check if drag distance exceeded pixel threshold OR velocity is high enough for fling
      const dragDistance = Math.abs(offset.y);
      const isDownwardSwipe = offset.y > 0 && dragDistance >= DRAG_THRESHOLD_PX;
      const isFling = velocity.magnitude >= FLING_VELOCITY_THRESHOLD;

      if (isFling) {
        // Fling behavior - any direction triggers onFlingAway
        triggerHaptic("medium");
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        const flingDirection = velocity.y > 0 ? "down" : "up";
        props.onStartBackgroundAnimation?.(flingDirection);
        animateFling(velocity);
      } else if (dragDistance >= DRAG_THRESHOLD_PX) {
        // Slow drag behavior (non-fling) - triggers onDragComplete
        const direction = offset.y > 0 ? "down" : "up";
        triggerHapticPattern("completion"); // Satisfying heavy + light pattern
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.(direction);
        animateToCompletion(direction);
      } else {
        const resetEvent = new CustomEvent("dragProgress", {
          detail: {
            direction: "none",
            intensity: 0,
            isDragging: false,
            resetToInitial: true,
          },
        });
        window.dispatchEvent(resetEvent);
        animateSnapBack();
      }
    };

    const handleTap = () => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      const currentTapCount = getTapCount() + 1;
      setTapCount(currentTapCount);

      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }

      if (currentTapCount >= 5) {
        props.onSkip();
        setTapCount(0);
      } else {
        tapTimer = window.setTimeout(() => {
          setTapCount(0);
        }, 800);
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
      triggerHaptic("light"); // Acknowledge the incomplete gesture
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
        setDragOffset({ x: currentX, y: currentY });

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
        setDragOffset({ x: startOffset.x, y: currentY });

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
        props.onSwipeUp();
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
        setDragOffset(physicsState.position);
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

    sunEl.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    });

    sunEl.addEventListener("touchmove", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    });

    sunEl.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleEnd();
    });

    sunEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const handleMouseUp = () => {
        handleEnd();
        eventTarget.removeEventListener("mousemove", handleMouseMove);
        eventTarget.removeEventListener("mouseup", handleMouseUp);
      };

      // Use shadow root if available, otherwise fall back to document
      const eventTarget: EventTarget = props.eventRoot || document;
      eventTarget.addEventListener(
        "mousemove",
        handleMouseMove as EventListener,
      );
      eventTarget.addEventListener("mouseup", handleMouseUp as EventListener);
    });
  };

  const sunSize = getSunSize(window.innerWidth);

  // Calculate progressive glow based on drag intensity
  const glowIntensity = getGlowIntensity();
  const colorTemp = getColorTemp();
  const velocityMag = getVelocityMagnitude();

  // Color temperature for corona: warm orange when down, cool blue when up
  const glowColor =
    colorTemp > 0.1
      ? "255, 200, 100"
      : colorTemp < -0.1
        ? "200, 220, 255"
        : "255, 255, 255";

  // Corona effect: soft layered glow that grows with intensity
  const coronaGlow =
    glowIntensity > 0
      ? `var(--sun-shadow),
         0 0 ${15 * glowIntensity}px rgba(${glowColor}, ${0.5 * glowIntensity}),
         0 0 ${40 * glowIntensity}px rgba(${glowColor}, ${0.25 * glowIntensity}),
         0 0 ${80 * glowIntensity}px rgba(${glowColor}, ${0.1 * glowIntensity})`
      : "var(--sun-shadow)";

  // Subtle motion blur during fast movement
  const blurAmount = Math.min(velocityMag / 1000, 1.5);
  const motionBlur = blurAmount > 0.4 ? `blur(${blurAmount}px)` : "none";

  return (
    <div
      ref={sunEl!}
      class="minded-sun"
      style={{
        transform: `translate(${getDragOffset().x}px, ${getDragOffset().y}px) scale(${sunSize.baseScale * getScale()}) rotate(${getRotation()}deg)`,
        opacity: getOpacity(),
        "box-shadow": coronaGlow,
        filter: motionBlur,
        transition:
          getIsDragging() || getIsAnimating()
            ? "none"
            : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease-out, filter 0.2s ease-out",
        width: `${sunSize.size}px`,
        height: `${sunSize.size}px`,
      }}
    >
      <div class="tap-indicator" classList={{ active: getTapCount() > 0 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div class="tap-dot" classList={{ filled: i <= getTapCount() }}></div>
        ))}
      </div>
    </div>
  );
};

export default Sun;

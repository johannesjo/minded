import { Component, createSignal, onMount } from "solid-js";
import "./Sun.scss";
import {
  DRAG_THRESHOLD_PX,
  FLING_VELOCITY_THRESHOLD,
  VELOCITY_SAMPLE_SIZE,
  FLING_ANIMATION_CONFIG,
  COMPLETION_ANIMATION_CONFIG,
  calculateVelocity,
  updatePhysics,
  calculateDragEffects,
  easeInOut,
  easeOut,
  triggerHaptic,
  getSunSize,
  type VelocitySample,
  type PhysicsState,
} from "./sunAnimationUtils";

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

  let tapTimer: number | null = null;
  let startPos = { x: 0, y: 0 };
  let animationFrame: number;
  let velocitySamples: VelocitySample[] = [];

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
    };
  });

  const setupDragHandlers = () => {
    if (!sunEl) return;

    let isDragIntent = false;
    let touchStartTime = 0;

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
      // Removed haptic feedback for initial touch
    };

    let hasTriggeredThresholdHaptic = false;

    const handleMove = (clientX: number, clientY: number) => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      const deltaX = clientX - startPos.x;
      const deltaY = clientY - startPos.y;

      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (moveDistance > 2 && !isDragIntent) {
        isDragIntent = true;
      }

      // Calculate drag progress and visual effects
      const dragDistance = Math.abs(deltaY);
      const effects = calculateDragEffects(deltaY, dragDistance);

      // Trigger haptic when crossing pixel threshold
      if (dragDistance >= DRAG_THRESHOLD_PX && !hasTriggeredThresholdHaptic) {
        triggerHaptic("medium");
        hasTriggeredThresholdHaptic = true;
        setIsBeyondThreshold(true);
      } else if (dragDistance < DRAG_THRESHOLD_PX) {
        hasTriggeredThresholdHaptic = false;
        setIsBeyondThreshold(false);
      }

      // Batch all state updates together
      setDragOffset({ x: deltaX, y: deltaY });
      setScale(effects.scale);
      setOpacity(effects.opacity);

      // Update progress and direction for visual indicators
      setDragProgress(effects.progress);
      setDragDirection(deltaY > 0 ? "down" : deltaY < 0 ? "up" : "none");

      // Track velocity samples
      const now = Date.now();
      velocitySamples.push({ x: clientX, y: clientY, timestamp: now });
      if (velocitySamples.length > VELOCITY_SAMPLE_SIZE) {
        velocitySamples.shift();
      }

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
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        const flingDirection = velocity.y > 0 ? "down" : "up";
        props.onStartBackgroundAnimation?.(flingDirection);
        animateFling(velocity);
      } else if (dragDistance >= DRAG_THRESHOLD_PX) {
        // Slow drag behavior (non-fling) - triggers onDragComplete
        const direction = offset.y > 0 ? "down" : "up";
        triggerHaptic("heavy");
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

    const animateSnapBack = () => {
      setIsAnimating(true);
      setIsBeyondThreshold(false); // Reset glow when snapping back
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();
      const startRotation = getRotation();

      const duration = 600;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOut(progress);

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

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
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

  return (
    <div
      ref={sunEl!}
      class="minded-sun"
      classList={{ "beyond-threshold": getIsBeyondThreshold() }}
      style={{
        transform: `translate(${getDragOffset().x}px, ${getDragOffset().y}px) scale(${sunSize.baseScale * getScale()}) rotate(${getRotation()}deg)`,
        opacity: getOpacity(),
        transition:
          getIsDragging() || getIsAnimating()
            ? "box-shadow 0.2s ease-out"
            : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
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

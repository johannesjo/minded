import { Component, createSignal, onMount } from "solid-js";
import "./Sun.scss";

const DRAG_THRESHOLD_PX = 100; // Pixel distance required to trigger action
const FLING_VELOCITY_THRESHOLD = 200; // Minimum velocity (px/s) to trigger fling
const VELOCITY_SAMPLE_SIZE = 5; // Number of position samples to track for velocity

interface SunProps {
  onSkip: () => void;
  onSwipeDown: () => void;
  onSwipeUp: () => void;
  onStartBackgroundAnimation?: (direction: "up" | "down") => void;
  onCompletionStarted?: (started: boolean) => void;
}

interface VelocitySample {
  x: number;
  y: number;
  timestamp: number;
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

  const getSunSize = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1024) {
      return { size: 120, baseScale: 1 };
    } else if (screenWidth >= 600) {
      return { size: 100, baseScale: 1 };
    } else {
      return { size: 80, baseScale: 1.0 };
    }
  };

  // Haptic feedback helper
  const triggerHaptic = (type: "light" | "medium" | "heavy") => {
    if ("vibrate" in navigator) {
      switch (type) {
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(20);
          break;
        case "heavy":
          navigator.vibrate(30);
          break;
      }
    }
  };

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
      velocitySamples = [{
        x: clientX,
        y: clientY,
        timestamp: Date.now()
      }];
      // Immediately set dragging state to disable transitions
      setIsDragging(true);
      // Light haptic feedback on touch
      triggerHaptic("light");
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

      // Calculate drag progress based on pixel distance
      const dragDistance = Math.abs(deltaY);
      const maxDragDistance = 200; // Maximum distance for full visual effect
      const dragProgress = Math.min(dragDistance / maxDragDistance, 1);

      // Trigger haptic when crossing pixel threshold
      if (dragDistance >= DRAG_THRESHOLD_PX && !hasTriggeredThresholdHaptic) {
        triggerHaptic("medium");
        hasTriggeredThresholdHaptic = true;
        setIsBeyondThreshold(true);
      } else if (dragDistance < DRAG_THRESHOLD_PX) {
        hasTriggeredThresholdHaptic = false;
        setIsBeyondThreshold(false);
      }

      // Calculate all visual effects
      let newScale, newOpacity;
      if (deltaY < 0) {
        // TODO make configurable
        newScale = Math.max(0.7, 1 - dragProgress * 0.3);
        newOpacity = Math.max(0.5, 1 - dragProgress * 0.5);
      } else {
        // TODO make configurable
        newScale = Math.min(2, 1 + dragProgress * 1.5);
        newOpacity = 1;
      }

      // Batch all state updates together
      setDragOffset({ x: deltaX, y: deltaY });
      setScale(newScale);
      setOpacity(newOpacity);

      // Update progress and direction for visual indicators
      setDragProgress(dragProgress);
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
        const intensity = dragProgress;

        const event = new CustomEvent("dragProgress", {
          detail: { direction, intensity, isDragging: true },
        });
        window.dispatchEvent(event);
      }
    };

    const calculateVelocity = (): { x: number; y: number; magnitude: number } => {
      if (velocitySamples.length < 2) {
        return { x: 0, y: 0, magnitude: 0 };
      }

      // Use recent samples for velocity calculation
      const recentSamples = velocitySamples.slice(-Math.min(3, velocitySamples.length));
      const first = recentSamples[0];
      const last = recentSamples[recentSamples.length - 1];
      const dt = (last.timestamp - first.timestamp) / 1000; // Convert to seconds

      if (dt === 0) {
        return { x: 0, y: 0, magnitude: 0 };
      }

      const vx = (last.x - first.x) / dt;
      const vy = (last.y - first.y) / dt;
      const magnitude = Math.sqrt(vx * vx + vy * vy);

      return { x: vx, y: vy, magnitude };
    };

    const handleEnd = () => {
      const duration = Date.now() - touchStartTime;
      const offset = getDragOffset();
      const velocity = calculateVelocity();

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

      if (isDownwardSwipe && !isFling) {
        // Keep existing downward swipe behavior (non-fling)
        const direction = "down";
        // Heavy haptic for completion
        triggerHaptic("heavy");
        // Disable all interactions once completion starts
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.(direction);
        animateToCompletion(direction);
      } else if (isFling) {
        // New fling behavior for any direction
        triggerHaptic("medium");
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        // Determine direction based on velocity for background animation
        const flingDirection = velocity.y > 0 ? "down" : "up";
        props.onStartBackgroundAnimation?.(flingDirection);
        animateFling(velocity);
      } else if (dragDistance >= DRAG_THRESHOLD_PX && offset.y < 0) {
        // Original upward drag behavior (non-fling)
        const direction = "up";
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

        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentX = startOffset.x * (1 - easeOut);
        const currentY = startOffset.y * (1 - easeOut);
        setDragOffset({ x: currentX, y: currentY });

        const currentScale = startScale + (1 - startScale) * easeOut;
        setScale(currentScale);

        const currentOpacity = startOpacity + (1 - startOpacity) * easeOut;
        setOpacity(currentOpacity);

        const currentRotation = startRotation * (1 - easeOut);
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

      const targetY =
        direction === "down" ? window.innerHeight : -window.innerHeight;
      const targetScale = direction === "down" ? 5.0 : 0.3;
      const targetOpacity = direction === "up" ? 0.2 : 1;

      const duration = 3000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeInOut =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentY = startOffset.y + (targetY - startOffset.y) * easeInOut;
        setDragOffset({ x: startOffset.x, y: currentY });

        const currentScale =
          startScale + (targetScale - startScale) * easeInOut;
        setScale(currentScale);

        const currentOpacity =
          startOpacity + (targetOpacity - startOpacity) * easeInOut;
        setOpacity(currentOpacity);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          if (direction === "down") {
            props.onSwipeDown();
          } else {
            props.onSwipeUp();
          }
        }
      };

      animate();
    };

    const animateFling = (velocity: { x: number; y: number; magnitude: number }) => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();
      
      // Safety check: ensure we have valid initial values
      if (!startOffset || startScale <= 0 || startOpacity <= 0) {
        props.onSwipeUp();
        return;
      }
      
      // Physics parameters
      const friction = 0.98; // Deceleration factor (0-1, lower = more friction)
      const gravity = 500; // Downward acceleration in px/s²
      const rotationFactor = 0.0005; // How much rotation based on horizontal velocity
      const minAnimationTime = 1500; // Minimum animation duration in ms before completion
      
      // Current state
      let position = { x: startOffset.x, y: startOffset.y };
      let currentVelocity = { x: velocity.x, y: velocity.y };
      let rotation = 0;
      
      const startTime = Date.now();
      let lastTime = startTime;
      
      const animate = () => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000; // Delta time in seconds
        lastTime = now;
        const elapsedTime = now - startTime;
        
        // Apply physics
        currentVelocity.x *= Math.pow(friction, dt * 60); // Normalize to 60fps
        currentVelocity.y *= Math.pow(friction, dt * 60);
        currentVelocity.y += gravity * dt; // Add gravity
        
        // Update position
        position.x += currentVelocity.x * dt;
        position.y += currentVelocity.y * dt;
        
        // Calculate rotation based on horizontal velocity
        rotation += currentVelocity.x * rotationFactor * dt;
        
        // Calculate distance from start for scaling/opacity
        const distance = Math.sqrt(
          Math.pow(position.x - startOffset.x, 2) + 
          Math.pow(position.y - startOffset.y, 2)
        );
        const maxDistance = Math.max(window.innerWidth, window.innerHeight);
        const distanceProgress = Math.min(distance / maxDistance, 1);
        
        // Scale down as it flies away
        const currentScale = startScale * (1 - distanceProgress * 0.5);
        setScale(currentScale);
        
        // Fade out
        const currentOpacity = startOpacity * (1 - distanceProgress * 0.8);
        setOpacity(currentOpacity);
        
        // Apply transform with rotation
        setDragOffset({ x: position.x, y: position.y });
        setRotation(rotation);
        
        // Check if sun is off screen or has slowed down enough
        const speed = Math.sqrt(
          currentVelocity.x * currentVelocity.x + 
          currentVelocity.y * currentVelocity.y
        );
        
        // Get sun's actual position on screen
        const sunRect = sunEl.getBoundingClientRect();
        const sunCenterX = sunRect.left + sunRect.width / 2;
        const sunCenterY = sunRect.top + sunRect.height / 2;
        const sunRadius = sunRect.width / 2;
        
        const isOffScreen = 
          sunCenterX < -sunRadius || sunCenterX > window.innerWidth + sunRadius ||
          sunCenterY < -sunRadius || sunCenterY > window.innerHeight + sunRadius;
        
        // Don't complete animation too early
        const hasMinTimeElapsed = elapsedTime >= minAnimationTime;
        const isAlmostStopped = speed < 10; // Very low speed threshold
        const isFadedOut = currentOpacity < 0.1; // Almost invisible
        
        // Only complete after minimum time has elapsed
        if (hasMinTimeElapsed && (isOffScreen || (isAlmostStopped && isFadedOut))) {
          setIsAnimating(false);
          // Call appropriate callback based on final direction
          if (position.y > window.innerHeight / 2) {
            props.onSwipeDown();
          } else {
            props.onSwipeUp();
          }
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
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  };

  const sunSize = getSunSize();

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

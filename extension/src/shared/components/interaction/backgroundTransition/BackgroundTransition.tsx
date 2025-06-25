import { Component, createSignal, onCleanup, onMount } from "solid-js";
import "./BackgroundTransition.scss";

interface BackgroundTransitionProps {
  dragThreshold?: number; // Percentage (0-1) of drag needed to trigger completion
}

// Color states for the background transition
const VISUAL_STATES = {
  blueSky: {
    top: "#4A90E2", // Bright blue
    bottom: "#87CEEB", // Sky blue
  },
  default: {
    top: "#1a1a1a", // Dark gray
    bottom: "#2d2d2d", // Slightly lighter gray
  },
  sunset: {
    top: "#FF6B35", // Deep orange
    bottom: "#FFCC33", // Golden yellow
  },
};

export const BackgroundTransition: Component<BackgroundTransitionProps> = (
  props,
) => {
  const [getProgress, setProgress] = createSignal(0); // -1 to 1, where 0 is default
  const [getIsAnimating, setIsAnimating] = createSignal(false);

  const dragThreshold = props.dragThreshold || 0.3; // Default 30% threshold

  let animationFrame: number;
  let backgroundEl: HTMLDivElement;

  onMount(() => {
    // Listen for drag progress events from Sun component
    const handleDragProgress = (event: CustomEvent) => {
      const { direction, intensity, isDragging, resetToInitial } = event.detail;

      if (resetToInitial) {
        animateToDefault();
        return;
      }

      if (isDragging) {
        // Map intensity (0-1) to progress (-1 to 1)
        const progress = direction === "up" ? -intensity : intensity;
        setProgress(progress);
        updateBackground(progress);
      }
    };

    const handleStartAnimation = (event: CustomEvent) => {
      const { direction } = event.detail;
      animateToCompletion(direction);
    };

    window.addEventListener(
      "dragProgress",
      handleDragProgress as EventListener,
    );
    window.addEventListener(
      "startBackgroundAnimation",
      handleStartAnimation as EventListener,
    );

    return () => {
      window.removeEventListener(
        "dragProgress",
        handleDragProgress as EventListener,
      );
      window.removeEventListener(
        "startBackgroundAnimation",
        handleStartAnimation as EventListener,
      );
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  });

  onCleanup(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  const interpolateColor = (
    color1: string,
    color2: string,
    factor: number,
  ): string => {
    // Convert hex to RGB
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 255;
    const g1 = (c1 >> 8) & 255;
    const b1 = c1 & 255;

    const r2 = (c2 >> 16) & 255;
    const g2 = (c2 >> 8) & 255;
    const b2 = c2 & 255;

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const updateBackground = (progress: number) => {
    if (!backgroundEl) return;

    let topColor: string;
    let bottomColor: string;

    if (progress < 0) {
      // Dragging up - interpolate from default to blue sky
      const factor = Math.abs(progress);
      topColor = interpolateColor(
        VISUAL_STATES.default.top,
        VISUAL_STATES.blueSky.top,
        factor,
      );
      bottomColor = interpolateColor(
        VISUAL_STATES.default.bottom,
        VISUAL_STATES.blueSky.bottom,
        factor,
      );
    } else if (progress > 0) {
      // Dragging down - interpolate from default to sunset
      const factor = progress;
      topColor = interpolateColor(
        VISUAL_STATES.default.top,
        VISUAL_STATES.sunset.top,
        factor,
      );
      bottomColor = interpolateColor(
        VISUAL_STATES.default.bottom,
        VISUAL_STATES.sunset.bottom,
        factor,
      );
    } else {
      // Default state
      topColor = VISUAL_STATES.default.top;
      bottomColor = VISUAL_STATES.default.bottom;
    }

    backgroundEl.style.background = `linear-gradient(to bottom, ${topColor}, ${bottomColor})`;
  };

  const animateToDefault = () => {
    setIsAnimating(true);
    const startProgress = getProgress();
    const duration = 600; // Match sun snap-back duration
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const animProgress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - animProgress, 3);

      const currentProgress = startProgress * (1 - easeOut);
      setProgress(currentProgress);
      updateBackground(currentProgress);

      if (animProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
  };

  const animateToCompletion = (direction: "up" | "down") => {
    setIsAnimating(true);
    const startProgress = getProgress();
    const targetProgress = direction === "up" ? -1 : 1;
    const duration = 3000; // Match sun completion duration
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const animProgress = Math.min(elapsed / duration, 1);

      // Ease in-out
      const easeInOut =
        animProgress < 0.5
          ? 2 * animProgress * animProgress
          : 1 - Math.pow(-2 * animProgress + 2, 2) / 2;

      const currentProgress =
        startProgress + (targetProgress - startProgress) * easeInOut;
      setProgress(currentProgress);
      updateBackground(currentProgress);

      if (animProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
  };

  return (
    <div
      ref={backgroundEl!}
      class="background-transition"
      classList={{ animating: getIsAnimating() }}
    />
  );
};

export default BackgroundTransition;

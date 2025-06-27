import { Component, createSignal, onCleanup, onMount } from "solid-js";
import "./BackgroundTransition.scss";
import Stars from "./Stars";

interface BackgroundTransitionProps {
  dragThreshold?: number; // Percentage (0-1) of drag needed to trigger completion
}

export const BackgroundTransition: Component<BackgroundTransitionProps> = (
  props,
) => {
  const [getProgress, setProgress] = createSignal(0); // -1 to 1, where 0 is default
  const [getIsAnimating, setIsAnimating] = createSignal(false);
  const [getShowStars, setShowStars] = createSignal(false);
  const [getIsDarkMode, setIsDarkMode] = createSignal(false);

  // const dragThreshold = props.dragThreshold || 0.3; // Default 30% threshold

  let animationFrame: number;

  const checkDarkMode = () => {
    const mindedWrapper = document.querySelector("#minded-6622");
    const isDark =
      mindedWrapper?.classList.contains("minded-6622-dark") || false;
    setIsDarkMode(isDark);
  };

  onMount(() => {
    // Check dark mode after a delay
    setTimeout(checkDarkMode, 100);

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


  const animateToDefault = () => {
    setIsAnimating(true);
    setShowStars(false); // Hide stars when returning to default
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

    // Show stars if dark mode for both directions
    if (getIsDarkMode()) {
      setTimeout(() => setShowStars(true), 500); // Delay slightly for better effect
    }

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

      if (animProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
  };

  return [
    <>
      <div
        class="background-transition background-default"
        classList={{ animating: getIsAnimating() }}
      />
      <div
        class="background-transition background-overlay background-blue"
        style={{
          opacity: Math.max(0, -getProgress() * 0.8),
        }}
      />
      <div
        class="background-transition background-overlay background-sunset"
        style={{
          opacity: Math.max(0, getProgress() * 0.8),
        }}
      />
    </>,
    <Stars isActive={getShowStars()} isDarkMode={getIsDarkMode()} />,
  ];
};

export default BackgroundTransition;

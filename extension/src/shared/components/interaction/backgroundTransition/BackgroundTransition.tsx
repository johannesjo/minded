import { Component, createSignal, onCleanup, onMount } from "solid-js";
import Stars from "./Stars";

type DragProgressEventDetail = {
  direction: "up" | "down" | "none";
  intensity: number;
  isDragging: boolean;
  resetToInitial?: boolean;
};

interface BackgroundTransitionProps {
  dragThreshold?: number; // Percentage (0-1) of drag needed to trigger completion
  shadowRoot?: ShadowRoot;
  isSunGradientAttached?: boolean;
}

export const BackgroundTransition: Component<BackgroundTransitionProps> = (
  props,
) => {
  const [getProgress, setProgress] = createSignal(0); // -1 to 1, where 0 is default
  const [getIsAnimating, setIsAnimating] = createSignal(false);
  const [getIsDarkMode, setIsDarkMode] = createSignal(false);

  // Stars come out as the night sky deepens. They are tied to the downward drag
  // (positive progress) and only after dark, squared so they emerge a beat behind
  // the rising sky and recede the same way as the sun is pulled back up or springs
  // home — the same gradual reveal the Android little-sun uses, rather than the old
  // snap-on at completion.
  const getStarsIntensity = () => {
    if (!getIsDarkMode()) return 0;
    const downward = Math.max(0, getProgress());
    return downward * downward;
  };

  // const dragThreshold = props.dragThreshold || 0.3; // Default 30% threshold

  let animationFrame: number;

  const checkDarkMode = () => {
    const mindedWrapper =
      props.shadowRoot?.getElementById("minded-6622") ??
      document.getElementById("minded-6622");
    const isDark =
      mindedWrapper?.classList.contains("minded-6622-dark") || false;
    setIsDarkMode(isDark);
  };

  // The glow now rides the sun disc's own box-shadow (Sun.scss `.minded-sun`),
  // so in light mode this layer just shows the plain gradient (no vignette, no
  // sun position to track). The class still drives the dark-mode gradient/sunset
  // overrides in BackgroundTransition.scss, so it stays attached by default.
  const getIsSunGradientAttached = () => props.isSunGradientAttached ?? true;

  onMount(() => {
    // Check dark mode after a delay
    setTimeout(checkDarkMode, 100);

    // Listen for drag progress events from Sun component
    const handleDragProgress = (event: CustomEvent) => {
      const { direction, intensity, isDragging, resetToInitial } =
        event.detail as DragProgressEventDetail;

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

    // A dashboard offer (grounding / let-go) takes over with its own full-screen
    // app-sky layer, so the transition background eases back to its default sky
    // rather than warming to night — otherwise that warmed sky (stars and all)
    // flashes when the offer fades out on close. Background-only: unlike the
    // dragProgress reset, it must not touch the interaction content's opacity.
    const handleResetBackground = () => animateToDefault();

    const eventTarget = props.shadowRoot ?? window;

    eventTarget.addEventListener(
      "dragProgress",
      handleDragProgress as EventListener,
    );
    eventTarget.addEventListener(
      "startBackgroundAnimation",
      handleStartAnimation as EventListener,
    );
    eventTarget.addEventListener(
      "resetBackgroundTransition",
      handleResetBackground as EventListener,
    );

    onCleanup(() => {
      eventTarget.removeEventListener(
        "dragProgress",
        handleDragProgress as EventListener,
      );
      eventTarget.removeEventListener(
        "startBackgroundAnimation",
        handleStartAnimation as EventListener,
      );
      eventTarget.removeEventListener(
        "resetBackgroundTransition",
        handleResetBackground as EventListener,
      );
    });
  });

  onCleanup(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  const animateToDefault = () => {
    // Take over any in-flight animation (e.g. a completion still easing toward
    // night) so the two rAF loops don't fight over progress.
    if (animationFrame) cancelAnimationFrame(animationFrame);
    setIsAnimating(true);
    // Stars fade out on their own as progress eases back to 0 (getStarsIntensity).
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

    // Stars need no explicit trigger here: a downward completion eases progress
    // toward 1, so getStarsIntensity() fades them in (an upward one keeps them at
    // 0). The gradual reveal already began during the drag itself.

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
        classList={{
          animating: getIsAnimating(),
          "sun-gradient-attached": getIsSunGradientAttached(),
        }}
      />
      <div
        class="background-transition background-overlay background-blue"
        style={{
          opacity: Math.max(0, -getProgress() * 0.8),
        }}
      />
      <div
        class="background-transition background-overlay background-sunset"
        classList={{
          "sun-gradient-attached": getIsSunGradientAttached(),
        }}
        style={{
          opacity: Math.max(0, getProgress() * 0.8),
        }}
      />
    </>,
    <Stars intensity={getStarsIntensity()} />,
  ];
};

export default BackgroundTransition;

import { Component, createSignal, onCleanup, onMount } from "solid-js";
import "./BackgroundTransition.scss";
import Stars from "./Stars";

interface BackgroundTransitionProps {
  dragThreshold?: number; // Percentage (0-1) of drag needed to trigger completion
}

interface TransitionColors {
  blueSkyTop: string;
  blueSkyBottom: string;
  sunsetTop: string;
  sunsetBottom: string;
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
  let backgroundEl: HTMLDivElement;
  let defaultGradient: string = '';
  let transitionColors: TransitionColors = {
    blueSkyTop: '#3e88dd',
    blueSkyBottom: '#66c5e4',
    sunsetTop: '#FF6B35',
    sunsetBottom: '#FFCC33',
  };

  const updateColorsFromCSS = () => {
    // Get the computed styles from the background element itself to ensure proper CSS variable inheritance
    if (!backgroundEl) return;
    
    const computedStyle = getComputedStyle(backgroundEl);
    
    // Check if dark mode
    const mindedWrapper = document.querySelector('#minded-6622');
    const isDark = mindedWrapper?.classList.contains('minded-6622-dark') || false;
    setIsDarkMode(isDark);
    
    // Get the default gradient from CSS variables
    const gradient = computedStyle.getPropertyValue('--background-gradient').trim();
    if (gradient) {
      defaultGradient = gradient;
    } else {
      // Fallback based on theme
      defaultGradient = isDark 
        ? 'linear-gradient(175deg, #071449, #1a137c, #401049)'
        : 'linear-gradient(175deg, #ccf1f6, #ffebf6, #f4f3b5)';
    }
    
    // Get transition colors from CSS variables
    const blueSkyTop = computedStyle.getPropertyValue('--bg-transition-bluesky-top').trim();
    const blueSkyBottom = computedStyle.getPropertyValue('--bg-transition-bluesky-bottom').trim();
    const sunsetTop = computedStyle.getPropertyValue('--bg-transition-sunset-top').trim();
    const sunsetBottom = computedStyle.getPropertyValue('--bg-transition-sunset-bottom').trim();
    
    if (blueSkyTop) transitionColors.blueSkyTop = blueSkyTop;
    if (blueSkyBottom) transitionColors.blueSkyBottom = blueSkyBottom;
    if (sunsetTop) transitionColors.sunsetTop = sunsetTop;
    if (sunsetBottom) transitionColors.sunsetBottom = sunsetBottom;
  };

  onMount(() => {
    // Wait for next tick to ensure backgroundEl is available
    requestAnimationFrame(() => {
      updateColorsFromCSS();
      
      // Also try after a delay in case CSS isn't loaded yet
      setTimeout(updateColorsFromCSS, 100);
    });

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

  const hexToRgba = (color: string, alpha: number): string => {
    // Ensure we have a valid hex color
    const hex = color.startsWith('#') ? color : `#${color}`;
    
    // Parse hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Return if we got valid RGB values
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Fallback - return the color with opacity
    return `rgba(128, 128, 128, ${alpha})`;
  };

  const updateBackground = (progress: number) => {
    if (!backgroundEl) return;

    if (progress === 0) {
      // Default state - use the CSS variable gradient
      backgroundEl.style.background = defaultGradient;
      return;
    }

    // For transitions, we'll blend between the default gradient and target colors
    // This creates a smooth transition effect
    if (progress < 0) {
      // Dragging up - transition to blue sky
      const factor = Math.abs(progress);
      const opacity = factor * 0.8; // Max 80% opacity for better blending
      
      // Create a layered gradient effect with colors from CSS variables
      backgroundEl.style.background = `
        linear-gradient(to bottom, 
          ${hexToRgba(transitionColors.blueSkyTop, opacity)}, 
          ${hexToRgba(transitionColors.blueSkyBottom, opacity)}
        ),
        ${defaultGradient}
      `;
    } else if (progress > 0) {
      // Dragging down - transition to sunset
      const factor = progress;
      const opacity = factor * 0.8; // Max 80% opacity for better blending
      
      // Create a layered gradient effect with colors from CSS variables
      backgroundEl.style.background = `
        linear-gradient(to bottom, 
          ${hexToRgba(transitionColors.sunsetTop, opacity)}, 
          ${hexToRgba(transitionColors.sunsetBottom, opacity)}
        ),
        ${defaultGradient}
      `;
    }
  };

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
      updateBackground(currentProgress);

      if (animProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
  };

  return [
    <div
      ref={backgroundEl!}
      class="background-transition"
      classList={{ animating: getIsAnimating() }}
    />,
    <Stars isActive={getShowStars()} isDarkMode={getIsDarkMode()} />
  ];
};

export default BackgroundTransition;

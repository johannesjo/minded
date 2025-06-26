import { Component, createSignal, onCleanup, onMount } from "solid-js";
import "./BackgroundTransition.scss";

interface BackgroundTransitionProps {
  dragThreshold?: number; // Percentage (0-1) of drag needed to trigger completion
}

// Theme-aware color states
const THEME_COLORS = {
  light: {
    blueSky: {
      top: "#3e88dd", // Bright blue
      bottom: "#66c5e4", // Sky blue
    },
    sunset: {
      top: "#FF6B35", // Deep orange
      bottom: "#FFCC33", // Golden yellow
    },
  },
  dark: {
    blueSky: {
      top: "#1e4d8d", // Darker blue for dark mode
      bottom: "#3675a4", // Darker sky blue
    },
    sunset: {
      top: "#b54925", // Darker orange for dark mode
      bottom: "#cc9922", // Darker yellow
    },
  },
};

export const BackgroundTransition: Component<BackgroundTransitionProps> = (
  props,
) => {
  const [getProgress, setProgress] = createSignal(0); // -1 to 1, where 0 is default
  const [getIsAnimating, setIsAnimating] = createSignal(false);

  // const dragThreshold = props.dragThreshold || 0.3; // Default 30% threshold

  let animationFrame: number;
  let backgroundEl: HTMLDivElement;
  let defaultGradient: string = '';
  let currentTheme: 'light' | 'dark' = 'light';

  onMount(() => {
    // Detect current theme
    const mindedWrapper = document.querySelector('#minded-6622');
    currentTheme = mindedWrapper?.classList.contains('minded-6622-dark') ? 'dark' : 'light';

    // Get the default gradient from CSS variables
    const computedStyle = getComputedStyle(mindedWrapper || document.documentElement);
    defaultGradient = computedStyle.getPropertyValue('--background-gradient').trim();
    
    // If no gradient found, use fallback based on theme
    if (!defaultGradient) {
      defaultGradient = currentTheme === 'dark' 
        ? 'linear-gradient(175deg, #071449, #1a137c, #401049)'
        : 'linear-gradient(175deg, #ccf1f6, #ffebf6, #f4f3b5)';
    }

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

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const updateBackground = (progress: number) => {
    if (!backgroundEl) return;

    if (progress === 0) {
      // Default state - use the CSS variable gradient
      backgroundEl.style.background = defaultGradient;
      return;
    }

    // Get theme-specific colors
    const themeColors = THEME_COLORS[currentTheme];

    // For transitions, we'll blend between the default gradient and target colors
    // This creates a smooth transition effect
    if (progress < 0) {
      // Dragging up - transition to blue sky
      const factor = Math.abs(progress);
      const opacity = factor * 0.8; // Max 80% opacity for better blending
      
      // Create a layered gradient effect with theme-specific colors
      backgroundEl.style.background = `
        linear-gradient(to bottom, 
          ${hexToRgba(themeColors.blueSky.top, opacity)}, 
          ${hexToRgba(themeColors.blueSky.bottom, opacity)}
        ),
        ${defaultGradient}
      `;
    } else if (progress > 0) {
      // Dragging down - transition to sunset
      const factor = progress;
      const opacity = factor * 0.8; // Max 80% opacity for better blending
      
      // Create a layered gradient effect with theme-specific colors
      backgroundEl.style.background = `
        linear-gradient(to bottom, 
          ${hexToRgba(themeColors.sunset.top, opacity)}, 
          ${hexToRgba(themeColors.sunset.bottom, opacity)}
        ),
        ${defaultGradient}
      `;
    }
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

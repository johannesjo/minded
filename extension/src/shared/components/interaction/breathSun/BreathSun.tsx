import type { Component } from "solid-js";

interface BreathSunProps {
  /** Breath fullness, 0 (emptied/exhaled) → 1 (full/inhaled). Defaults to 0. */
  fill?: number;
  size?: "compact" | "large";
  /** "sun" (default) or "moon" - picks the matching `.minded-sun` look. */
  variant?: "sun" | "moon";
}

export const BreathSun: Component<BreathSunProps> = (props) => {
  const fill = () => Math.max(0, Math.min(1, props.fill ?? 0));

  return (
    <div
      class="breath-sun"
      classList={{
        "breath-sun--compact": props.size === "compact",
        "breath-sun--large": props.size === "large",
      }}
      style={{ "--breath-fill": fill().toString() }}
      aria-hidden="true"
    >
      {/* The very same disc as the always-visible companion sun (global
          `.minded-sun`: warm shadow, idle-breath glow, sun/moon variants).
          Here it is simply guided through the breath via scale, so the
          wind-down reads as the same sun the user always sees. The caller drives
          `fill` continuously (rAF), so the disc tracks the breath clock exactly
          rather than lagging behind it. */}
      <span class="minded-sun" classList={{ moon: props.variant === "moon" }} />
    </div>
  );
};

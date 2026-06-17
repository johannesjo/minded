import type { Component } from "solid-js";

export type BreathSunPhase = "ready" | "inhale" | "hold" | "exhale";

interface BreathSunProps {
  phase: BreathSunPhase;
  progress?: number;
  durationSeconds?: number;
  size?: "compact" | "large";
  /** Mirror the always-visible companion sun (a moon once it's dark). */
  variant?: "sun" | "moon";
}

export const BreathSun: Component<BreathSunProps> = (props) => {
  const progress = () =>
    Math.max(
      0,
      Math.min(1, props.progress ?? (props.phase === "hold" ? 1 : 0)),
    );

  return (
    <div
      class="breath-sun"
      classList={{
        "breath-sun--compact": props.size === "compact",
        "breath-sun--large": props.size === "large",
        "is-inhale": props.phase === "inhale",
        "is-hold": props.phase === "hold",
        "is-exhale": props.phase === "exhale",
      }}
      style={{
        "--breath-progress": progress().toString(),
        "--breath-duration": `${props.durationSeconds ?? 7}s`,
      }}
      aria-hidden="true"
    >
      {/* The very same disc as the always-visible companion sun (global
          `.minded-sun`: warm shadow, idle-breath glow, moon-at-night). Here it
          is simply guided through the 4-7-8 breath via scale, so the wind-down
          reads as the same sun the user always sees. */}
      <span class="minded-sun" classList={{ moon: props.variant === "moon" }} />
    </div>
  );
};

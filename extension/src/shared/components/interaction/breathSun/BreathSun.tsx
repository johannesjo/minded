import type { Component } from "solid-js";

export type BreathSunPhase = "ready" | "inhale" | "hold" | "exhale" | "cycle";

interface BreathSunProps {
  phase: BreathSunPhase;
  progress?: number;
  durationSeconds?: number;
  size?: "compact" | "large";
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
        "is-cycle": props.phase === "cycle",
      }}
      style={{
        "--breath-progress": progress().toString(),
        "--breath-duration": `${props.durationSeconds ?? 7}s`,
      }}
      aria-hidden="true"
    >
      <div class="breath-sun__core" />
    </div>
  );
};

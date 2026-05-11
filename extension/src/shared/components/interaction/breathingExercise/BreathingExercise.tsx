import { createEffect, createSignal, onCleanup } from "solid-js";
import styles from "./BreathingExercise.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import type { BreathSunPhase } from "@src/shared/components/interaction/breathSun/BreathSun";

const BreathingExercise = () => {
  const [stage, setStage] = createSignal("Ready");
  const [timeLeft, setTimeLeft] = createSignal(0);

  const stages = [
    { name: "Breathing in", duration: 4 },
    { name: "Hold", duration: 7 },
    { name: "Breathing out", duration: 8 },
  ];

  let currentStageIndex = -1;
  let intervalId: NodeJS.Timeout | null = null;

  const startExercise = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    currentStageIndex = 0;
    setStage(stages[currentStageIndex].name);
    setTimeLeft(stages[currentStageIndex].duration);
    intervalId = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
  };

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  createEffect(() => {
    if (timeLeft() === 0 && currentStageIndex !== -1) {
      currentStageIndex = (currentStageIndex + 1) % stages.length;
      setStage(stages[currentStageIndex].name);
      setTimeLeft(stages[currentStageIndex].duration);
    }
  });

  const currentDuration = () =>
    stages.find((s) => s.name === stage())?.duration ?? 1;
  const progress = () => {
    if (stage() === "Ready") {
      return 0;
    }

    const duration = currentDuration();
    return Math.max(0, Math.min(1, (duration - timeLeft()) / duration));
  };
  const sunPhase = (): BreathSunPhase => {
    switch (stage()) {
      case "Breathing in":
        return "inhale";
      case "Hold":
        return "hold";
      case "Breathing out":
        return "exhale";
      default:
        return "ready";
    }
  };
  const cue = () => {
    switch (stage()) {
      case "Breathing in":
        return "Let the breath arrive";
      case "Hold":
        return "Stay soft";
      case "Breathing out":
        return "Release slowly";
      default:
        return "4 - 7 - 8 breathing";
    }
  };

  return (
    <div class={styles.BreathingExercise}>
      <BreathSun phase={sunPhase()} progress={progress()} size="large" />
      <div class={styles.copy}>
        <h1>{stage()}</h1>
        <p>{cue()}</p>
        <strong>{timeLeft() || ""}</strong>
      </div>
      <button onClick={startExercise} class="btnTxtOutline">
        {stage() === "Ready" ? "Start" : "Restart"}
      </button>
    </div>
  );
};

export default BreathingExercise;

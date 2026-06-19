import { createSignal, onCleanup } from "solid-js";
import styles from "./BreathingExercise.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import {
  getBreathStateAt,
  getCueOpacity,
  WIND_DOWN_PATTERN,
  type BreathPhaseName,
} from "@src/shared/components/interaction/breathTimeline";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

const PHASE_LABEL: Record<BreathPhaseName, string> = {
  inhale: "Breathing in",
  hold: "Hold",
  exhale: "Breathing out",
};

const PHASE_CUE: Record<BreathPhaseName, string> = {
  inhale: "Let the breath arrive",
  hold: "Stay soft",
  exhale: "Release slowly",
};

const BreathingExercise = () => {
  const [isRunning, setIsRunning] = createSignal(false);
  const [fill, setFill] = createSignal(0);
  const [phase, setPhase] = createSignal<BreathPhaseName>("inhale");
  const [secondsLeft, setSecondsLeft] = createSignal(0);
  const [cueFade, setCueFade] = createSignal(1);

  let frame: number | undefined;
  let startTime = 0;

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = undefined;
  };
  onCleanup(stop);

  // One clock drives the sun, the stage label, the cue and the countdown, so
  // they can't drift apart — and the sun is updated every frame, so it tracks
  // the count exactly instead of lagging behind a CSS transition. The cue fade
  // dips to 0 on each phase turn so the label fades out before the next fades in.
  const tick = () => {
    const state = getBreathStateAt(Date.now() - startTime, WIND_DOWN_PATTERN, {
      loop: true,
    });
    setFill(state.fill);
    setPhase(state.phase);
    setSecondsLeft(state.phaseSecondsLeft);
    setCueFade(getCueOpacity(state));
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    stop();
    startTime = Date.now();
    setIsRunning(true);
    tick();
  };

  // Hold the copy steady (no fade) before the exercise starts and when the user
  // asked for reduced motion — the sun is frozen in that mode, so a pulsing
  // label would be out of place.
  const cueOpacity = () =>
    isRunning() && !prefersReducedMotion() ? cueFade() : 1;

  return (
    <div class={styles.BreathingExercise}>
      {/* The wind-down is a sleep flow, so it re-uses the same moon as the
          rest of it (the "Sleep well" screen) — not a time-of-day sun/moon. */}
      <BreathSun fill={isRunning() ? fill() : 0} size="large" variant="moon" />
      <div class={styles.copy}>
        <h1 style={{ opacity: cueOpacity() }}>
          {isRunning() ? PHASE_LABEL[phase()] : "Ready"}
        </h1>
        <p style={{ opacity: cueOpacity() }}>
          {isRunning() ? PHASE_CUE[phase()] : "4 - 7 - 8 breathing"}
        </p>
        <strong>{isRunning() ? secondsLeft() : ""}</strong>
      </div>
      <button onClick={start} class="btnTxtOutline">
        {isRunning() ? "Restart" : "Start"}
      </button>
    </div>
  );
};

export default BreathingExercise;

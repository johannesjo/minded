import { createMemo, createSignal, onCleanup } from "solid-js";
import styles from "./BreathingExercise.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import {
  getBreathStateAt,
  getCueOpacity,
  WIND_DOWN_PATTERN,
} from "@src/shared/components/interaction/breathTimeline";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

const PHASE_LABEL = {
  inhale: "Breathing in",
  hold: "Hold",
  exhale: "Breathing out",
} as const;

const PHASE_CUE = {
  inhale: "Let the breath arrive",
  hold: "Stay soft",
  exhale: "Release slowly",
} as const;

const BreathingExercise = () => {
  const [isRunning, setIsRunning] = createSignal(false);
  const [elapsedMs, setElapsedMs] = createSignal(0);

  // Read once: it can't meaningfully change mid-session, and reading it per
  // frame would re-run matchMedia 60×/s on the hot path.
  const reducedMotion = prefersReducedMotion();

  let frame: number | undefined;
  let startTime = 0;

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = undefined;
  };
  onCleanup(stop);

  // One clock (elapsedMs) drives everything below, so the sun, label, cue and
  // countdown can't drift — and each derived memo only re-renders its own node
  // when its value actually changes (the label 3×/cycle, the count once/sec),
  // while the sun and fade update every frame.
  const breath = createMemo(() =>
    getBreathStateAt(elapsedMs(), WIND_DOWN_PATTERN, { loop: true }),
  );
  const fill = createMemo(() => (isRunning() ? breath().fill : 0));
  const label = createMemo(() =>
    isRunning() ? PHASE_LABEL[breath().phase] : "Ready",
  );
  const cue = createMemo(() =>
    isRunning() ? PHASE_CUE[breath().phase] : "4 - 7 - 8 breathing",
  );
  const count = createMemo(() =>
    isRunning() ? breath().phaseSecondsLeft : "",
  );
  // Hold the copy steady (no fade) before the exercise starts and under reduced
  // motion — the sun is frozen then, so a pulsing label would be out of place.
  const cueOpacity = createMemo(() =>
    isRunning() && !reducedMotion ? getCueOpacity(breath()) : 1,
  );

  const tick = () => {
    setElapsedMs(Date.now() - startTime);
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    stop();
    startTime = Date.now();
    setElapsedMs(0);
    setIsRunning(true);
    tick();
  };

  return (
    <div class={styles.BreathingExercise}>
      {/* The wind-down is a sleep flow, so it re-uses the same moon as the
          rest of it (the "Sleep well" screen) — not a time-of-day sun/moon. */}
      <BreathSun fill={fill()} size="large" variant="moon" />
      <div class={styles.copy}>
        <h1 style={{ opacity: cueOpacity() }}>{label()}</h1>
        <p style={{ opacity: cueOpacity() }}>{cue()}</p>
        <strong>{count()}</strong>
      </div>
      <button onClick={start} class="btnTxtOutline">
        {isRunning() ? "Restart" : "Start"}
      </button>
    </div>
  );
};

export default BreathingExercise;

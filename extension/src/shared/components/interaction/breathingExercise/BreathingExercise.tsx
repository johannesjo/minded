import { createMemo, Show } from "solid-js";
import styles from "./BreathingExercise.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import {
  cueOpacity,
  WIND_DOWN_PATTERN,
} from "@src/shared/components/interaction/breathTimeline";
import { useBreathClock } from "@src/shared/components/interaction/useBreathClock";
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
  // Read once: it can't meaningfully change mid-session, and reading it per
  // frame would re-run matchMedia 60×/s on the hot path.
  const reducedMotion = prefersReducedMotion();

  // One shared clock drives the sun, label, cue and countdown, so they can't
  // drift — and each derived memo only re-renders its own node when its value
  // actually changes (the label 3×/cycle, the count once/sec), while the sun and
  // fade update every frame.
  const clock = useBreathClock({ pattern: WIND_DOWN_PATTERN, loop: true });

  const fill = createMemo(() => (clock.isStarted() ? clock.breath().fill : 0));
  const label = createMemo(() =>
    clock.isStarted() ? PHASE_LABEL[clock.breath().phase] : "Ready",
  );
  const cue = createMemo(() =>
    clock.isStarted() ? PHASE_CUE[clock.breath().phase] : "4 - 7 - 8 breathing",
  );
  const count = createMemo(() =>
    clock.isStarted() ? clock.breath().phaseSecondsLeft : "",
  );
  // Hold the copy steady (no fade) before the exercise starts; once running, the
  // shared helper folds in reduced motion so the label stops pulsing then.
  const opacity = createMemo(() =>
    clock.isStarted() ? cueOpacity(clock.breath(), reducedMotion) : 1,
  );

  return (
    <div class={styles.BreathingExercise}>
      {/* The wind-down is a sleep flow, so it re-uses the same moon as the
          rest of it (the "Sleep well" screen) — not a time-of-day sun/moon. */}
      <BreathSun fill={fill()} size="large" variant="moon" />
      <div class={styles.copy}>
        <h1 style={{ opacity: opacity() }}>{label()}</h1>
        <p style={{ opacity: opacity() }}>{cue()}</p>
        <strong>{count()}</strong>
      </div>
      {/* Start only — no restart: once the breath is flowing we don't offer to
          yank the user back to the beginning of a wind-down meditation. */}
      <Show when={!clock.isStarted()}>
        <button onClick={() => clock.start()} class="btnTxt isOutline">
          Start
        </button>
      </Show>
    </div>
  );
};

export default BreathingExercise;

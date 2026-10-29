import { createMemo, createSignal, onCleanup } from "solid-js";
import styles from "./BreathingExercise.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import {
  cueOpacity,
  WIND_DOWN_PATTERN,
} from "@src/shared/components/interaction/breathTimeline";
import { useBreathClock } from "@src/shared/components/interaction/useBreathClock";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import Btn from "@src/shared/components/ui/Btn";

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
  // drift - and each derived memo only re-renders its own node when its value
  // actually changes (the label 3×/cycle, the count once/sec), while the sun and
  // fade update every frame.
  const clock = useBreathClock({ pattern: WIND_DOWN_PATTERN, loop: true });

  // "Start" lets the ready copy and the button ease away first, then begins
  // the breath - whose cue opens from 0, so the copy runs on without a cut.
  // The button keeps its slot once gone, so nothing above it recentres.
  const START_FADE_MS = reducedMotion ? 0 : 400;
  const [isStarting, setIsStarting] = createSignal(false);
  let startTimeout: number | undefined;
  const begin = () => {
    if (isStarting()) return;
    setIsStarting(true);
    startTimeout = window.setTimeout(() => clock.start(), START_FADE_MS);
  };
  onCleanup(() => window.clearTimeout(startTimeout));

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
    clock.isStarted()
      ? cueOpacity(clock.breath(), reducedMotion)
      : isStarting()
        ? 0
        : 1,
  );
  // Only the hand-off into the breath eases in CSS; once running, the clock
  // writes the opacity every frame and a transition would only drag behind it.
  const copyTransition = () =>
    isStarting() && !clock.isStarted()
      ? `opacity ${START_FADE_MS}ms var(--ease-out)`
      : undefined;

  return (
    <div class={styles.BreathingExercise}>
      {/* The wind-down is a sleep flow, so it re-uses the same moon as the
          rest of it (the "Sleep well" screen) - not a time-of-day sun/moon. */}
      <BreathSun fill={fill()} size="large" variant="moon" />
      <div class={styles.copy}>
        <h1 style={{ opacity: opacity(), transition: copyTransition() }}>
          {label()}
        </h1>
        <p style={{ opacity: opacity() * 0.76, transition: copyTransition() }}>
          {cue()}
        </p>
        {/* Fades with its cue, so the count resets to the next phase's length
            while invisible rather than jumping in plain sight. */}
        <strong style={{ opacity: opacity() }}>{count()}</strong>
      </div>
      {/* Start only - no restart: once the breath is flowing we don't offer to
          yank the user back to the beginning of a wind-down meditation. */}
      <div
        class={styles.start}
        classList={{ [styles.isGone]: isStarting() }}
        inert={isStarting() ? true : undefined}
      >
        <Btn outline onClick={begin}>
          Start
        </Btn>
      </div>
    </div>
  );
};

export default BreathingExercise;

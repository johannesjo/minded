import { Component, createMemo, untrack } from "solid-js";
import {
  BREATH_PAUSE_PATTERN,
  cueOpacity,
  type BreathPhaseName,
} from "@src/shared/components/interaction/breathTimeline";
import { useBreathClock } from "@src/shared/components/interaction/useBreathClock";
import { getBreathStartedAt } from "@src/shared/components/interaction/sun/sunStore";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

interface StrongFrictionBreathPauseProps {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

const PHASE_CUE: Record<BreathPhaseName, string> = {
  inhale: "Breathe in",
  hold: "Hold",
  exhale: "Breathe out",
};

export const StrongFrictionBreathPause: Component<
  StrongFrictionBreathPauseProps
> = (props) => {
  // Read once: it can't meaningfully change during a ~12s pause, and reading it
  // per frame would re-run matchMedia 60×/s on the hot path.
  const reducedMotion = prefersReducedMotion();

  // The cue, its count and its fade read from the SAME breath clock that scales
  // the sun: both compute elapsed from `breathStartedAt`, published by the sun
  // when its glide lands (Sun's onBreathStart → sunStore). So the copy and the
  // disc turn through inhale → hold → exhale on exactly the same beats, and
  // CUE_FADE_MS only tunes the fade feel — it is no longer load-bearing for sync
  // (GitHub #27). Under reduced motion the sun is frozen and never publishes an
  // origin, so the clock falls back to its mount origin and the countdown still
  // ticks to completion.
  const clock = useBreathClock({
    pattern: BREATH_PAUSE_PATTERN,
    originAt: getBreathStartedAt,
    reducedMotion,
    // props.seconds is fixed for a given pause (getPostSunPauseSeconds), so read
    // it once, untracked — the duration never changes mid-pause.
    durationMs: untrack(() => Math.max(1, props.seconds) * 1000),
    onComplete: () => props.onComplete(),
  });

  const getCue = createMemo(() => PHASE_CUE[clock.breath().phase]);
  // Count down the seconds left in the current phase (4, 3, 2, 1) so the user can
  // pace the breath, matching the wind-down exercise's countdown.
  const getCount = createMemo(() => clock.breath().phaseSecondsLeft);
  // Hidden during the sun's glide-in (no origin yet); once the breath begins, the
  // shared helper folds in reduced motion (steady, no fade).
  const getCueFade = createMemo(() =>
    clock.isStarted() ? cueOpacity(clock.breath(), reducedMotion) : 0,
  );

  return (
    <div class="strong-friction-breath-pause">
      {/* The persistent interaction sun (owned by InteractionCommon) glides in
          and breathes over this space — see the `breathe` prop on <Sun>. The
          spacer reserves its footprint so the cue copy keeps its position. */}
      <div class="strong-friction-breath-pause__sun-space" aria-hidden="true" />

      {/* The whole block cross-fades together on each phase turn, so the count
          resets to the next phase's length while invisible, never mid-jump. */}
      <div
        class="strong-friction-breath-pause__copy"
        style={{ opacity: getCueFade() }}
      >
        <div class="txtBig">{getCue()}</div>
        <div class="txtSmaller">{getCount()}</div>
      </div>

      <button type="button" class="btnTxt" onClick={() => props.onCancel()}>
        cancel
      </button>
    </div>
  );
};

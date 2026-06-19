import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import {
  BREATH_PAUSE_PATTERN,
  getBreathStateAt,
  getCueOpacity,
  type BreathPhaseName,
} from "@src/shared/components/interaction/breathTimeline";
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
  const [getRemainingSeconds, setRemainingSeconds] = createSignal(0);
  const [getElapsedMs, setElapsedMs] = createSignal(0);

  let frame: number | undefined;
  let timeoutId: number | undefined;

  // The cue text and its fade both read from the same breath model that scales
  // the sun, so the copy and the disc move through inhale → hold → exhale on
  // exactly the same beats, and the label fades out before the next fades in.
  const getBreath = createMemo(() =>
    getBreathStateAt(getElapsedMs(), BREATH_PAUSE_PATTERN),
  );
  const getCue = createMemo(() => PHASE_CUE[getBreath().phase]);
  // Hold the cue steady (no fade) when the user asked for reduced motion — the
  // sun is already frozen in that mode, so a pulsing label would be out of place.
  const getCueFade = createMemo(() =>
    prefersReducedMotion() ? 1 : getCueOpacity(getBreath()),
  );

  const clearTimers = () => {
    if (frame) window.cancelAnimationFrame(frame);
    if (timeoutId) window.clearTimeout(timeoutId);
    frame = undefined;
    timeoutId = undefined;
  };

  createEffect(() => {
    const durationSeconds = Math.max(1, props.seconds);
    const onComplete = props.onComplete;
    const startedAt = Date.now();
    const durationMs = durationSeconds * 1000;

    setRemainingSeconds(durationSeconds);
    setElapsedMs(0);

    // rAF (not a coarse interval) so the cue's cross-fade lands cleanly at ~0
    // opacity on each phase turn instead of popping mid-fade.
    const tick = () => {
      const elapsedMs = Date.now() - startedAt;
      setElapsedMs(elapsedMs);
      setRemainingSeconds(
        Math.ceil(Math.max(0, durationMs - elapsedMs) / 1000),
      );
      if (elapsedMs < durationMs) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);

    timeoutId = window.setTimeout(onComplete, durationMs);

    onCleanup(clearTimers);
  });

  return (
    <div class="strong-friction-breath-pause">
      {/* The persistent interaction sun (owned by InteractionCommon) glides in
          and breathes over this space — see the `breathe` prop on <Sun>. The
          spacer reserves its footprint so the cue copy keeps its position. */}
      <div class="strong-friction-breath-pause__sun-space" aria-hidden="true" />

      <div class="strong-friction-breath-pause__copy">
        <div class="txtBig" style={{ opacity: getCueFade() }}>
          {getCue()}
        </div>
        <div class="txtSmaller">Continue in {getRemainingSeconds()}</div>
      </div>

      <button type="button" class="btnTxt" onClick={() => props.onCancel()}>
        cancel
      </button>
    </div>
  );
};

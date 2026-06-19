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
  const [getElapsedMs, setElapsedMs] = createSignal(0);

  // Read once: it can't meaningfully change during a ~12s pause, and reading it
  // per frame would re-run matchMedia 60×/s on the hot path.
  const reducedMotion = prefersReducedMotion();

  let frame: number | undefined;
  let timeoutId: number | undefined;

  // The cue text, its count and its fade all read from the same breath model
  // that scales the sun, so the copy and the disc move through inhale → hold →
  // exhale on exactly the same beats, and the label fades out before the next
  // fades in.
  const getBreath = createMemo(() =>
    getBreathStateAt(getElapsedMs(), BREATH_PAUSE_PATTERN),
  );
  const getCue = createMemo(() => PHASE_CUE[getBreath().phase]);
  // Count down the seconds left in the current phase (4, 3, 2, 1) so the user
  // can pace the breath, matching the wind-down exercise's countdown.
  const getCount = createMemo(() => getBreath().phaseSecondsLeft);
  // Hold the copy steady (no fade) when the user asked for reduced motion — the
  // sun is already frozen in that mode, so a pulsing label would be out of place.
  const getCueFade = createMemo(() =>
    reducedMotion ? 1 : getCueOpacity(getBreath()),
  );

  const clearTimers = () => {
    if (frame) window.cancelAnimationFrame(frame);
    if (timeoutId) window.clearTimeout(timeoutId);
    frame = undefined;
    timeoutId = undefined;
  };

  createEffect(() => {
    const durationMs = Math.max(1, props.seconds) * 1000;
    const onComplete = props.onComplete;
    // This clock starts on mount; the sun's breath clock (Sun.startBreathCycle)
    // starts when its glide lands — a few tens of ms apart. Both read the same
    // BREATH_PAUSE_PATTERN, and the cue cross-fade (CUE_FADE_MS) is far longer
    // than that gap, so the small offset is invisible at the phase turns. Keep
    // CUE_FADE_MS comfortably above the glide/transition delta if either moves.
    const startedAt = Date.now();

    setElapsedMs(0);

    // rAF (not a coarse interval) so the cue's cross-fade lands cleanly at ~0
    // opacity on each phase turn instead of popping mid-fade.
    const tick = () => {
      const elapsedMs = Date.now() - startedAt;
      setElapsedMs(elapsedMs);
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

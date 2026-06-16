import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
interface StrongFrictionBreathPauseProps {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

export const StrongFrictionBreathPause: Component<
  StrongFrictionBreathPauseProps
> = (props) => {
  const [getRemainingSeconds, setRemainingSeconds] = createSignal(0);
  const [getElapsedRatio, setElapsedRatio] = createSignal(0);

  let intervalId: number | undefined;
  let timeoutId: number | undefined;

  const getCue = createMemo(() =>
    getElapsedRatio() < 0.48 ? "Breathe in" : "Breathe out",
  );

  const clearTimers = () => {
    if (intervalId) window.clearInterval(intervalId);
    if (timeoutId) window.clearTimeout(timeoutId);
    intervalId = undefined;
    timeoutId = undefined;
  };

  createEffect(() => {
    const durationSeconds = Math.max(1, props.seconds);
    const onComplete = props.onComplete;
    const startedAt = Date.now();
    const durationMs = durationSeconds * 1000;

    setRemainingSeconds(durationSeconds);
    setElapsedRatio(0);

    intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      setRemainingSeconds(Math.ceil(remainingMs / 1000));
      setElapsedRatio(Math.min(1, elapsedMs / durationMs));
    }, 100);

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
        <div class="txtBig">{getCue()}</div>
        <div class="txtSmaller">Continue in {getRemainingSeconds()}</div>
      </div>

      <button type="button" class="btnTxt" onClick={() => props.onCancel()}>
        cancel
      </button>
    </div>
  );
};

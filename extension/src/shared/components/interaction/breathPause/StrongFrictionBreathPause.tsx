import {
  Component,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

interface StrongFrictionBreathPauseProps {
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

export const StrongFrictionBreathPause: Component<
  StrongFrictionBreathPauseProps
> = (props) => {
  const [getRemainingSeconds, setRemainingSeconds] = createSignal(
    props.seconds,
  );
  const [getElapsedRatio, setElapsedRatio] = createSignal(0);

  let intervalId: number | undefined;
  let timeoutId: number | undefined;

  const getCue = createMemo(() =>
    getElapsedRatio() < 0.48 ? "Breathe in" : "Breathe out",
  );

  onMount(() => {
    const startedAt = Date.now();
    const durationMs = props.seconds * 1000;

    intervalId = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      setRemainingSeconds(Math.ceil(remainingMs / 1000));
      setElapsedRatio(Math.min(1, elapsedMs / durationMs));
    }, 100);

    timeoutId = window.setTimeout(() => {
      props.onComplete();
    }, durationMs);
  });

  onCleanup(() => {
    if (intervalId) window.clearInterval(intervalId);
    if (timeoutId) window.clearTimeout(timeoutId);
  });

  return (
    <div class="strong-friction-breath-pause">
      <div class="strong-friction-breath-pause__sunWrap" aria-hidden="true">
        <div
          class="strong-friction-breath-pause__sun"
          style={{ "--breath-duration": `${props.seconds}s` }}
        />
      </div>

      <div class="strong-friction-breath-pause__copy">
        <div class="txtBig">{getCue()}</div>
        <div class="txtSmaller">Continue in {getRemainingSeconds()}</div>
      </div>

      <button type="button" class="btnTxt" onClick={props.onCancel}>
        cancel
      </button>
    </div>
  );
};

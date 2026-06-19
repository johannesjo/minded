import { createSignal, For, JSX, Match, onCleanup, Switch } from "solid-js";
import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";
import {
  getSurfCue,
  getSurfDurationMs,
  URGE_INTENSITY_STEPS,
} from "./urgeSurfing.const";

/**
 * Urge surfing: rather than acting on the pull to open a distracting site, the
 * user rates how strong it feels, watches it crest and fall like a wave, then
 * notices how it changed. The before/after ratings stay in local state; their
 * value is the in-the-moment realisation that the urge passes on its own, not a
 * stored metric.
 */

type UrgeSurfingPhase = "intro" | "rateBefore" | "surf" | "rateAfter" | "done";

/** How often the wave timer ticks while surfing. */
const TICK_MS = 200;

interface UrgeSurfingProps {
  frictionLevel: FrictionLevel;
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
  /** Swell the real sun through a slow breath of `seconds` as the wave rides. */
  onSunWaveStart: (seconds: number) => void;
  /** Settle the real sun back from its wave breath to the interactive disc. */
  onSunWaveEnd: () => void;
}

export const UrgeSurfing = (props: UrgeSurfingProps): JSX.Element => {
  const [getPhase, setPhase] = createSignal<UrgeSurfingPhase>("intro");
  const [getFraction, setFraction] = createSignal(0);
  const [getBefore, setBefore] = createSignal(0);
  const [getAfter, setAfter] = createSignal(0);

  let intervalId: ReturnType<typeof setInterval> | undefined;

  const stopTimer = (): void => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const startSurf = (): void => {
    // Capture the callbacks outside the interval so the reactive `props` access
    // does not trip the solid/reactivity lint rule (as ScreenOff does).
    const onCancelCountdown = props.onCancelCountdown;
    const onSunWaveEnd = props.onSunWaveEnd;
    const durationMs = getSurfDurationMs(props.frictionLevel);
    // Ride the wave on the one real sun: ask it to swell through a single slow
    // breath that lasts exactly as long as the wave timer below.
    props.onSunWaveStart(durationMs / 1000);
    const startTS = Date.now();
    setFraction(0);
    setPhase("surf");
    stopTimer();
    intervalId = setInterval(() => {
      // Keep the parent's auto-dismiss timer at bay; the wave runs without any
      // pointer input, so nothing else would reset the countdown.
      onCancelCountdown();
      const fraction = Math.min(1, (Date.now() - startTS) / durationMs);
      setFraction(fraction);
      if (fraction >= 1) {
        stopTimer();
        onSunWaveEnd();
        setPhase("rateAfter");
      }
    }, TICK_MS);
  };

  const finish = (): void => {
    setPhase("done");
    // Reward the completed practice with a sun tap, like the screen-off minute.
    // Fire-and-forget: the reflection screen gives the write ample time to flush.
    void countSunTap().catch((error: unknown) => {
      console.error("Failed to count urge-surfing sun tap", error);
    });
  };

  const handleRate = (value: number): void => {
    props.onCancelCountdown();
    if (getPhase() === "rateBefore") {
      setBefore(value);
      startSurf();
    } else {
      setAfter(value);
      finish();
    }
  };

  const skipNow = (): void => {
    // Stop the wave timer up front so a pending tick can't push us to
    // "rateAfter" after the parent has already torn the interaction down.
    stopTimer();
    // Settle the sun back only if we'd actually set it swelling (the surf phase).
    if (getPhase() === "surf") props.onSunWaveEnd();
    props.onSkip();
  };

  const reflection = (): string => {
    const before = getBefore();
    const after = getAfter();
    if (after < before) {
      return `The wave passed. It eased from ${before} to ${after}.`;
    }
    if (after === before) {
      return "You stayed with it instead of acting. That's the practice.";
    }
    return "Tougher than it looked, and you still didn't act on it. That's the practice.";
  };

  onCleanup(stopTimer);

  return (
    <div class="urge-surfing" onMouseMove={() => props.onCancelCountdown()}>
      <Switch>
        <Match when={getPhase() === "intro"}>
          <div class="txtBig interaction-heading">
            There's an urge to open this. 🌊
          </div>
          <p class="urge-surfing-sub">
            Instead of feeding it, let's watch it. Urges rise and pass on their
            own.
          </p>
          <div class="urge-surfing-actions">
            <button
              type="button"
              class="btnTxt"
              onClick={() => setPhase("rateBefore")}
            >
              Surf it
            </button>
            <button type="button" class="btnTxtOutline" onClick={skipNow}>
              Not now
            </button>
          </div>
        </Match>

        <Match when={getPhase() === "rateBefore" || getPhase() === "rateAfter"}>
          <div class="txtBig interaction-heading">
            {getPhase() === "rateBefore"
              ? "How strong is the pull right now?"
              : "And now, how strong is it?"}
          </div>
          <div class="urge-surfing-scale">
            <For each={[...URGE_INTENSITY_STEPS]}>
              {(step) => (
                <button
                  type="button"
                  class="btnToggleSelectSmall"
                  onClick={() => handleRate(step)}
                >
                  {step}
                </button>
              )}
            </For>
          </div>
          <div class="urge-surfing-scale-labels">
            <span>barely</span>
            <span>intense</span>
          </div>
        </Match>

        <Match when={getPhase() === "surf"}>
          {/* No disc here: the one real sun (driven via onSunWaveStart) does the
              swell, so the wave reads as the same sun the user always sees. */}
          <p class="urge-surfing-cue">{getSurfCue(getFraction())}</p>
          <button type="button" class="btnTxtOutline" onClick={skipNow}>
            Skip
          </button>
        </Match>

        <Match when={getPhase() === "done"}>
          <div class="txtBig interaction-heading">{reflection()}</div>
          <button
            type="button"
            class="btnTxt"
            onClick={() => props.onSuccess()}
          >
            Continue
          </button>
        </Match>
      </Switch>
    </div>
  );
};

import { createSignal, For, JSX, Match, onCleanup, Switch } from "solid-js";
import styles from "./UrgeSurfing.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import type { BreathSunPhase } from "@src/shared/components/interaction/breathSun/BreathSun";
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
 * notices how it changed. The before/after ratings stay in local state — their
 * value is the in-the-moment realisation that the urge passes on its own, not a
 * stored metric.
 */

type UrgeSurfingPhase = "intro" | "rateBefore" | "surf" | "rateAfter" | "done";

/** How often the wave timer ticks while surfing. */
const TICK_MS = 200;
// Fractions of the wave spent rising / cresting before it falls.
const RISE_UNTIL = 0.4;
const CREST_UNTIL = 0.55;

interface UrgeSurfingProps {
  frictionLevel: FrictionLevel;
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
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
    // Capture the callback outside the interval so the reactive `props` access
    // does not trip the solid/reactivity lint rule (as ScreenOff does).
    const onCancelCountdown = props.onCancelCountdown;
    const durationMs = getSurfDurationMs(props.frictionLevel);
    const startTS = Date.now();
    setFraction(0);
    setPhase("surf");
    stopTimer();
    intervalId = setInterval(() => {
      // Keep the parent's auto-dismiss timer at bay — the wave runs without any
      // pointer input, so nothing else would reset the countdown.
      onCancelCountdown();
      const fraction = Math.min(1, (Date.now() - startTS) / durationMs);
      setFraction(fraction);
      if (fraction >= 1) {
        stopTimer();
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
    props.onSkip();
  };

  const reflection = (): string => {
    const before = getBefore();
    const after = getAfter();
    if (after < before) {
      return `The wave passed — it eased from ${before} to ${after}.`;
    }
    if (after === before) {
      return "You stayed with it instead of acting. That's the practice.";
    }
    return "Tougher than it looked — and you still didn't act on it. That's the practice.";
  };

  const sunPhase = (): BreathSunPhase => {
    const f = getFraction();
    if (f < RISE_UNTIL) return "inhale";
    if (f < CREST_UNTIL) return "hold";
    return "exhale";
  };

  const sunProgress = (): number => {
    const f = getFraction();
    if (f < RISE_UNTIL) return f / RISE_UNTIL;
    if (f < CREST_UNTIL) return 1;
    return (f - CREST_UNTIL) / (1 - CREST_UNTIL);
  };

  onCleanup(stopTimer);

  return (
    <div
      class={styles.UrgeSurfing}
      onMouseMove={() => props.onCancelCountdown()}
    >
      <Switch>
        <Match when={getPhase() === "intro"}>
          <div class="txtBig interaction-heading">
            There's an urge to open this. 🌊
          </div>
          <p class={styles.sub}>
            Instead of feeding it, let's watch it — urges rise and pass on their
            own.
          </p>
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
        </Match>

        <Match when={getPhase() === "rateBefore" || getPhase() === "rateAfter"}>
          <div class="txtBig interaction-heading">
            {getPhase() === "rateBefore"
              ? "How strong is the pull right now?"
              : "And now — how strong is it?"}
          </div>
          <div class={styles.scale}>
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
          <div class={styles.scaleLabels}>
            <span>barely</span>
            <span>intense</span>
          </div>
        </Match>

        <Match when={getPhase() === "surf"}>
          <BreathSun phase={sunPhase()} progress={sunProgress()} size="large" />
          <p class={styles.cue}>{getSurfCue(getFraction())}</p>
          <button type="button" class={styles.skip} onClick={skipNow}>
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

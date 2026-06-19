import {
  createEffect,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import {
  countSunTap,
  IS_APP,
} from "@src/dataInterface/commonSyncDataInterface";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
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
  // Drives the cross-screen fade: drop to 0, swap the screen while hidden, then
  // back to 1 (see .urge-surfing's opacity transition).
  const [getScreenOpacity, setScreenOpacity] = createSignal(1);

  const FADE_MS = 240;
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let fadeTimeout: ReturnType<typeof setTimeout> | undefined;

  const stopTimer = (): void => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const clearFade = (): void => {
    if (fadeTimeout !== undefined) {
      clearTimeout(fadeTimeout);
      fadeTimeout = undefined;
    }
  };

  // Fade the current screen out, swap to `next` while hidden, then fade in. The
  // optional `onHidden` runs at the swap so sun/timer changes land with the new
  // screen rather than before the old one has faded.
  const goToPhase = (next: UrgeSurfingPhase, onHidden?: () => void): void => {
    const fadeMs = prefersReducedMotion() ? 0 : FADE_MS;
    clearFade();
    setScreenOpacity(0);
    fadeTimeout = setTimeout(() => {
      fadeTimeout = undefined;
      onHidden?.();
      setPhase(next);
      setScreenOpacity(1);
    }, fadeMs);
  };

  // Crossfade the surf cues into one another as the wave moves through its
  // phases, rather than snapping each new line in.
  // Resting opacity of the cue (slightly dimmed); the crossfade drops to 0.
  const CUE_OPACITY = 0.82;
  const [getCueText, setCueText] = createSignal(getSurfCue(0));
  const [getCueOpacity, setCueOpacity] = createSignal(CUE_OPACITY);
  let cueFadeTimeout: ReturnType<typeof setTimeout> | undefined;
  let shownCue = getSurfCue(0);

  const clearCueFade = (): void => {
    if (cueFadeTimeout !== undefined) {
      clearTimeout(cueFadeTimeout);
      cueFadeTimeout = undefined;
    }
  };

  createEffect(() => {
    const next = getSurfCue(getFraction());
    if (next === shownCue) return;
    shownCue = next;
    const fadeMs = prefersReducedMotion() ? 0 : FADE_MS;
    clearCueFade();
    setCueOpacity(0);
    cueFadeTimeout = setTimeout(() => {
      cueFadeTimeout = undefined;
      setCueText(next);
      setCueOpacity(CUE_OPACITY);
    }, fadeMs);
  });

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
    stopTimer();
    intervalId = setInterval(() => {
      // Keep the parent's auto-dismiss timer at bay; the wave runs without any
      // pointer input, so nothing else would reset the countdown.
      onCancelCountdown();
      const fraction = Math.min(1, (Date.now() - startTS) / durationMs);
      setFraction(fraction);
      if (fraction >= 1) {
        stopTimer();
        // Settle the sun back as the surf screen fades to the after-rating.
        goToPhase("rateAfter", onSunWaveEnd);
      }
    }, TICK_MS);
  };

  const finish = (): void => {
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
      // Start the wave now (the sun begins its swell); the screen cross-fades
      // from the rating to the surf cue over it.
      startSurf();
      goToPhase("surf");
    } else {
      setAfter(value);
      goToPhase("done", finish);
    }
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

  onCleanup(() => {
    stopTimer();
    clearFade();
    clearCueFade();
  });

  return (
    <div
      class="urge-surfing"
      classList={{ "is-surf": getPhase() === "surf" }}
      style={{ opacity: getScreenOpacity() }}
      onMouseMove={() => props.onCancelCountdown()}
    >
      <Switch>
        <Match when={getPhase() === "intro"}>
          <div class="txtBig interaction-heading">
            There's an urge to open this. 🌊
          </div>
          <p class="urge-surfing-sub">
            Instead of feeding it, let's watch it. Urges rise and pass on their
            own.
          </p>
          {/* No "skip" here: triple-tapping (or flinging) the persistent sun is
              the universal way out of any interaction, so a second button would
              be redundant. */}
          <button
            type="button"
            class="btnTxt"
            onClick={() => goToPhase("rateBefore")}
          >
            Surf it
          </button>
        </Match>

        <Match when={getPhase() === "rateBefore" || getPhase() === "rateAfter"}>
          <div class="txtBig interaction-heading">
            {getPhase() === "rateBefore"
              ? IS_APP
                ? "How strong is the pull to open this app right now?"
                : "How strong is the pull to open this website right now?"
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
          {/* No disc and no skip here: the one real sun (driven via
              onSunWaveStart) gently pulses in place and is the focus; the short
              wave simply plays out. */}
          <p class="urge-surfing-cue" style={{ opacity: getCueOpacity() }}>
            {getCueText()}
          </p>
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

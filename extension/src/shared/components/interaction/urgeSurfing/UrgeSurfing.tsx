import {
  createEffect,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import { IS_APP } from "@src/dataInterface/commonSyncDataInterface";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { createScreenFade } from "@src/util/screenFade";
import Btn from "@src/shared/components/ui/Btn";
import {
  getSurfCue,
  getSurfDurationMs,
  URGE_INTENSITY_STEPS,
} from "./urgeSurfing.const";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import {
  VOICE_REVEAL,
  voiceFollowStyle,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

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

  const FADE_MS = 480;
  // Hold the first surf cue back this long so the pulsing sun reads on its own
  // for a beat before the guidance arrives.
  const FIRST_CUE_DELAY_MS = 1400;
  // The surf cues ease into one another slowly and softly - much gentler than the
  // quick screen fade.
  const CUE_FADE_MS = 900;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  // Cross-screen fade between the phases (intro → rate → surf → after → done).
  // The shared handler drops opacity to 0, swaps the screen while hidden, then
  // eases back in (bound to .urge-surfing's opacity below). Matches FADE_MS to
  // the CSS transition on .urge-surfing.
  const screenFade = createScreenFade(FADE_MS);

  const stopTimer = (): void => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  // Fade the current screen out, swap to `next` while hidden, then fade in. The
  // optional `onHidden` runs at the swap so sun/timer changes land with the new
  // screen rather than before the old one has faded.
  const goToPhase = (next: UrgeSurfingPhase, onHidden?: () => void): void => {
    screenFade.toScreen(() => {
      onHidden?.();
      setPhase(next);
    });
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
    const fadeMs = prefersReducedMotion() ? 0 : CUE_FADE_MS;
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
    // Hold the first instruction back a moment so the pulsing sun reads first,
    // then fade it in.
    clearCueFade();
    shownCue = getSurfCue(0);
    setCueText(shownCue);
    setCueOpacity(0);
    cueFadeTimeout = setTimeout(() => {
      cueFadeTimeout = undefined;
      setCueOpacity(CUE_OPACITY);
    }, FIRST_CUE_DELAY_MS);
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

  // Deliberately NO countSunTap here: sun taps feed the friction level and the
  // "you've come back a few times" return-loop insight, i.e. they measure
  // returns to the pull - not engagement with the practice. Counting a
  // completed wave would make diligent practice *escalate* the next
  // intervention (and double-count the tap the subsequent submit records).

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
      goToPhase("done");
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
    clearCueFade();
  });

  const heading = (): string => {
    switch (getPhase()) {
      case "intro":
        return "There's an urge to open this.";
      case "rateBefore":
        return IS_APP
          ? "How strong is the pull to open this app right now?"
          : "How strong is the pull to open this website right now?";
      case "rateAfter":
        return "And now, how strong is it?";
      case "done":
        return reflection();
      default:
        return "";
    }
  };

  // Coming back from the wave, the sun glides home from its surf anchor as the
  // after-rating swaps in (onSunWaveEnd at the swap): let it land before the
  // question is spoken, so the eye follows one moving thing at a time.
  const headingLead = (): number =>
    getPhase() === "rateAfter" ? VOICE_REVEAL.SUN_GLIDE_LEAD_MS : 0;

  return (
    <div
      class="urge-surfing voice-follow-scope"
      classList={{ "is-surf": getPhase() === "surf" }}
      style={{
        opacity: screenFade.opacity(),
        "pointer-events": screenFade.isFading() ? "none" : undefined,
        ...voiceFollowStyle(heading(), headingLead()),
      }}
      onMouseMove={() => props.onCancelCountdown()}
    >
      <Switch>
        <Match when={getPhase() === "intro"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <p class="urge-surfing-sub voice-follow">
            Instead of feeding it, let's watch it. Urges rise and pass on their
            own.
          </p>
          {/* No "skip" here: triple-tapping (or flinging) the persistent sun is
              the universal way out of any interaction, so a second button would
              be redundant. */}
          <Btn
            voice
            class="voice-follow"
            onClick={() => goToPhase("rateBefore")}
          >
            Surf it
          </Btn>
        </Match>

        <Match when={getPhase() === "rateBefore" || getPhase() === "rateAfter"}>
          <VoiceReveal
            class="txtBig interaction-heading"
            text={heading()}
            lead={headingLead()}
          />
          <div class="urge-surfing-scale voice-follow">
            <For each={[...URGE_INTENSITY_STEPS]}>
              {(step) => (
                <Btn variant="toggle" small onClick={() => handleRate(step)}>
                  {step}
                </Btn>
              )}
            </For>
          </div>
          <div class="urge-surfing-scale-labels voice-follow">
            <span>barely</span>
            <span>intense</span>
          </div>
        </Match>

        <Match when={getPhase() === "surf"}>
          {/* No disc and no skip here: the one real sun (driven via
              onSunWaveStart) gently pulses in place and is the focus; the short
              wave simply plays out. */}
          <p
            class="urge-surfing-cue"
            style={{
              opacity: getCueOpacity(),
              transition: prefersReducedMotion()
                ? "none"
                : `opacity ${CUE_FADE_MS}ms ease-in-out`,
            }}
          >
            {getCueText()}
          </p>
        </Match>

        <Match when={getPhase() === "done"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <Btn class="voice-follow" onClick={() => props.onSuccess()}>
            Continue
          </Btn>
        </Match>
      </Switch>
    </div>
  );
};

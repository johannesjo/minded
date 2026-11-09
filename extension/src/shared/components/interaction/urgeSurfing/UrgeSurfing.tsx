import {
  createEffect,
  createSignal,
  JSX,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { createScreenFade } from "@src/util/screenFade";
import Btn from "@src/shared/components/ui/Btn";
import { getSurfCue, getSurfDurationMs } from "./urgeSurfing.const";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import {
  VOICE_REVEAL,
  voiceFollowStyle,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

/**
 * Urge surfing: rather than acting on the pull to open a distracting site, the
 * user watches it crest and fall like a wave, led by the sun, and is met by one
 * quiet line at the end.
 *
 * Deliberately no ratings and no verdict (#183), in the register grounding
 * closes with: no before/after scale, no echoed number, no "that's the
 * practice". A rating whose answer goes nowhere is a question that only costs
 * the user, and any close that grades the outcome - eased, held, tougher - is
 * a judgment the app cannot honestly make. Every wave ends on the same line.
 */

type UrgeSurfingPhase = "intro" | "surf" | "done";

/** The one close for every wave: present tense, no praise, no number. */
const URGE_SURFING_CLOSE = "The wave moves on its own.";

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

  const FADE_MS = 480;
  // Hold the first surf cue back this long so the pulsing sun reads on its own
  // for a beat before the guidance arrives.
  const FIRST_CUE_DELAY_MS = 1400;
  // The surf cues ease into one another slowly and softly - much gentler than the
  // quick screen fade.
  const CUE_FADE_MS = 900;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  // Cross-screen fade between the phases (intro → surf → done).
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
        // Settle the sun back as the surf screen fades to the close.
        goToPhase("done", onSunWaveEnd);
      }
    }, TICK_MS);
  };

  // Deliberately NO countSunTap here: sun taps feed the friction level and the
  // "you've come back a few times" return-loop insight, i.e. they measure
  // returns to the pull - not engagement with the practice. Counting a
  // completed wave would make diligent practice *escalate* the next
  // intervention (and double-count the tap the subsequent submit records).

  const handleSurf = (): void => {
    props.onCancelCountdown();
    // Start the wave now (the sun begins its swell); the screen cross-fades
    // from the intro to the surf cue over it.
    startSurf();
    goToPhase("surf");
  };

  onCleanup(() => {
    stopTimer();
    clearCueFade();
  });

  const heading = (): string => {
    switch (getPhase()) {
      case "intro":
        return "There's an urge to open this.";
      case "done":
        return URGE_SURFING_CLOSE;
      default:
        return "";
    }
  };

  // Coming back from the wave, the sun glides home from its surf anchor as the
  // close swaps in (onSunWaveEnd at the swap): let it land before the line is
  // spoken, so the eye follows one moving thing at a time.
  const headingLead = (): number =>
    getPhase() === "done" ? VOICE_REVEAL.SUN_GLIDE_LEAD_MS : 0;

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
          <Btn voice class="voice-follow" onClick={handleSurf}>
            Surf it
          </Btn>
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
          <VoiceReveal
            class="txtBig interaction-heading"
            text={heading()}
            lead={headingLead()}
          />
          <Btn class="voice-follow" onClick={() => props.onSuccess()}>
            Continue
          </Btn>
        </Match>
      </Switch>
    </div>
  );
};

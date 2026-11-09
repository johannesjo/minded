/* @refresh reload */
import {
  createEffect,
  createSignal,
  JSX,
  Match,
  on,
  onCleanup,
  Switch,
} from "solid-js";
import Btn from "@src/shared/components/ui/Btn";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import { voiceFollowStyle } from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";
import { createScreenFade } from "@src/util/screenFade";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

/**
 * "Screen-Off Minute" - an Android-only strong-friction intervention that
 * invites the user to physically lock their phone for a minute. The return is
 * noticed via the page `visibilitychange` event (the WebView reports hidden
 * when the screen turns off / the app is backgrounded).
 *
 * Deliberately no fail state and no verdict (#183), in the register grounding
 * closes with: the minute is the invitation, not a bar to clear. Coming back
 * early is met exactly like coming back after the minute - no "almost", no
 * retry, no "nice" - because timing the break and grading it turned stepping
 * away into a test the user could fail.
 */

type ScreenOffPhase = "intro" | "armed" | "done";

const SCREEN_OFF_HEADINGS: Record<ScreenOffPhase, string> = {
  intro: "Put your phone down for a minute?",
  armed: "Lock your phone now - come back in a minute.",
  done: "Welcome back.",
};

/**
 * Delay between showing the closing line and closing the app: long enough
 * for the screen fade and the line's word-by-word arrival to land and rest a
 * moment - the goodbye is never cut off mid-sentence.
 */
const DONE_EXIT_DELAY_MS = 2600;

/** Cross-screen fade between phases - the same soft swap urge surfing uses. */
const SCREEN_FADE_MS = 480;

export const ScreenOffInteraction: (props: {
  onSkip: () => void;
  onCancelCountdown: () => void;
  onLeaveNow: () => void;
}) => JSX.Element = (props) => {
  const [getPhase, setPhase] = createSignal<ScreenOffPhase>("intro");
  // What's on screen trails the logical phase through a soft fade-out → swap →
  // fade-in, instead of hard-cutting the old heading and buttons away. The
  // logic (visibility handling) keeps reading getPhase, which changes at once -
  // a phone locked within the fade must still count.
  const [getShownPhase, setShownPhase] = createSignal<ScreenOffPhase>("intro");
  const screenFade = createScreenFade(SCREEN_FADE_MS);
  // The faded swap shows the phase current at its midpoint, so a change that
  // lands mid-fade is never overwritten by the stale one.
  let latestPhase: ScreenOffPhase = "intro";
  createEffect(
    on(
      getPhase,
      (phase) => {
        latestPhase = phase;
        // Hidden (screen off): nothing to see, so swap without a fade.
        if (document.hidden) setShownPhase(phase);
        else screenFade.toScreen(() => setShownPhase(latestPhase));
      },
      { defer: true },
    ),
  );

  // Plain refs - these never need to drive rendering.
  let hasBeenAway = false;
  let doneTimeoutId: number | undefined;
  let isDisposed = false;

  const welcomeBack = (): void => {
    // Read outside the timeout callback so the reactive `props` access does
    // not trip the solid/reactivity lint rule (as StrongFrictionBreathPause does).
    const onLeaveNow = props.onLeaveNow;
    setPhase("done");
    // Deliberately NO countSunTap here: sun taps feed the friction level and
    // the return-loop insight - they measure returns to the pull, not practice.
    // Counting a screen-off break would make the calming practice
    // escalate the next intervention (and no other leave path counts a tap).
    doneTimeoutId = window.setTimeout(() => {
      doneTimeoutId = undefined;
      if (!isDisposed) onLeaveNow();
    }, DONE_EXIT_DELAY_MS);
  };

  const handleVisibilityChange = (): void => {
    // Only the armed screen listens - visibility changes during intro/done are
    // ignored.
    if (getPhase() !== "armed") {
      return;
    }

    if (document.hidden) {
      hasBeenAway = true;
      return;
    }

    // Back after any time away - a full minute or a few seconds - is simply
    // back: no timing, no fail state.
    if (hasBeenAway) {
      welcomeBack();
    }
  };

  const arm = (): void => {
    hasBeenAway = false;
    setPhase("armed");
    document.addEventListener("visibilitychange", handleVisibilityChange);
  };

  onCleanup(() => {
    isDisposed = true;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (doneTimeoutId !== undefined) {
      window.clearTimeout(doneTimeoutId);
    }
  });

  const heading = (): string => SCREEN_OFF_HEADINGS[getShownPhase()];

  return (
    <div
      class="voice-follow-scope"
      style={{
        ...voiceFollowStyle(heading()),
        opacity: screenFade.opacity(),
        // The outgoing screen's buttons go inert as it fades - e.g. "Just go
        // in" must not fire once the return has already moved on.
        "pointer-events": screenFade.isFading() ? "none" : undefined,
        transition: prefersReducedMotion()
          ? "none"
          : `opacity ${SCREEN_FADE_MS}ms ease-in-out`,
      }}
      onmouseenter={props.onCancelCountdown}
    >
      <Switch>
        <Match when={getShownPhase() === "intro"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <Btn class="voice-follow" onClick={arm}>
            Lock my phone for a minute
          </Btn>
          <Btn class="voice-follow" onClick={() => props.onSkip()}>
            Not now
          </Btn>
        </Match>

        <Match when={getShownPhase() === "armed"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <Btn class="voice-follow" onClick={() => props.onSkip()}>
            Just go in
          </Btn>
        </Match>

        <Match when={getShownPhase() === "done"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
        </Match>
      </Switch>
    </div>
  );
};

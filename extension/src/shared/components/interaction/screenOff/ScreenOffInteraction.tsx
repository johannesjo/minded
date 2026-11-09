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
 * away into a test the user could fail. So nothing here reads a clock: there
 * is no minimum time away, not even a short one.
 *
 * The close is wordless. Every return ends in leaving the app, and on a real
 * unlock the native side is already doing that: OverlayControllerService's
 * restoreOverlayAfterUnlock hides an intervention and goes home half a second
 * after the unlock, whatever this screen is showing. A closing line would be
 * cut off mid-sentence there, and a greeting ("Welcome back.") contradicts
 * the leave that follows it. The armed copy fades, the sun rests alone for a
 * beat, and the leave runs.
 */

type ScreenOffPhase = "intro" | "armed" | "done";

const SCREEN_OFF_HEADINGS: Record<ScreenOffPhase, string> = {
  intro: "Put your phone down for a minute?",
  armed: "Lock your phone now - come back in a minute.",
  // Wordless - see above.
  done: "",
};

/** Cross-screen fade between phases - the same soft swap urge surfing uses. */
const SCREEN_FADE_MS = 480;

/**
 * Delay between the return and closing the app: the armed screen's fade-out,
 * then a short rest on the sun alone - the leave never cuts into the fade.
 */
const DONE_EXIT_DELAY_MS = SCREEN_FADE_MS + 600;

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

  const closeAfterReturn = (): void => {
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
      closeAfterReturn();
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

        {/* "done" renders nothing: the close is wordless (see the header). */}
      </Switch>
    </div>
  );
};

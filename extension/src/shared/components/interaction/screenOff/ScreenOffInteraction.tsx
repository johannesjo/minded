/* @refresh reload */
import { createSignal, JSX, Match, onCleanup, Switch } from "solid-js";
import Btn from "@src/shared/components/ui/Btn";
import {
  evaluateScreenOff,
  SCREEN_OFF_TARGET_MS,
} from "@src/shared/components/interaction/screenOff/screenOffEval";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import { voiceFollowStyle } from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

/**
 * "Screen-Off Minute" - an Android-only strong-friction intervention that
 * asks the user to physically lock their phone for a minute. Success is
 * verified via the page `visibilitychange` event (the WebView reports hidden
 * when the screen turns off / the app is backgrounded).
 */

type ScreenOffPhase = "intro" | "armed" | "tooEarly" | "done";

const SCREEN_OFF_HEADINGS: Record<ScreenOffPhase, string> = {
  intro: "Put your phone down for a minute?",
  armed: "Lock your phone now - come back in a minute.",
  tooEarly: "Almost - stay away a little longer.",
  done: "Nice - enjoy the break.",
};

/** Delay between showing the success message and closing the app. */
const DONE_EXIT_DELAY_MS = 1600;

export const ScreenOffInteraction: (props: {
  onSkip: () => void;
  onCancelCountdown: () => void;
  onLeaveNow: () => void;
}) => JSX.Element = (props) => {
  const [getPhase, setPhase] = createSignal<ScreenOffPhase>("intro");

  // Plain refs - these never need to drive rendering.
  let hiddenAt: number | undefined;
  let doneTimeoutId: number | undefined;
  let isDisposed = false;

  const completeSuccessfully = (): void => {
    // Read outside the timeout callback so the reactive `props` access does
    // not trip the solid/reactivity lint rule (as StrongFrictionBreathPause does).
    const onLeaveNow = props.onLeaveNow;
    setPhase("done");
    // Deliberately NO countSunTap here: sun taps feed the friction level and
    // the return-loop insight - they measure returns to the pull, not practice.
    // Counting a completed screen-off minute would make the calming practice
    // escalate the next intervention (and no other leave path counts a tap).
    doneTimeoutId = window.setTimeout(() => {
      doneTimeoutId = undefined;
      if (!isDisposed) onLeaveNow();
    }, DONE_EXIT_DELAY_MS);
  };

  const handleVisibilityChange = (): void => {
    const phase = getPhase();
    // Only an active ("armed") or just-failed ("tooEarly") attempt counts -
    // visibility changes during intro/done are ignored.
    if (phase !== "armed" && phase !== "tooEarly") {
      return;
    }

    if (document.hidden) {
      // Locking the phone (re)starts the attempt, even straight from the
      // "too early" screen without tapping "Try again" first.
      hiddenAt = Date.now();
      if (phase === "tooEarly") {
        setPhase("armed");
      }
      return;
    }

    if (hiddenAt === undefined) {
      return;
    }

    const result = evaluateScreenOff({
      hiddenAt,
      shownAt: Date.now(),
      targetMs: SCREEN_OFF_TARGET_MS,
    });
    hiddenAt = undefined;

    if (result.success) {
      completeSuccessfully();
      return;
    }

    setPhase("tooEarly");
  };

  /** Begin (or restart) a screen-off attempt. */
  const arm = (): void => {
    hiddenAt = undefined;
    setPhase("armed");
    // Re-adding the same handler reference is a no-op per the DOM spec,
    // so calling arm() again from "Try again" is safe.
    document.addEventListener("visibilitychange", handleVisibilityChange);
  };

  onCleanup(() => {
    isDisposed = true;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (doneTimeoutId !== undefined) {
      window.clearTimeout(doneTimeoutId);
    }
  });

  const heading = (): string => SCREEN_OFF_HEADINGS[getPhase()];

  return (
    <div
      class="voice-follow-scope"
      style={voiceFollowStyle(heading())}
      onmouseenter={props.onCancelCountdown}
    >
      <Switch>
        <Match when={getPhase() === "intro"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <Btn class="voice-follow" onClick={arm}>
            Lock my phone for a minute
          </Btn>
          <Btn class="voice-follow" onClick={() => props.onSkip()}>
            Not now
          </Btn>
        </Match>

        <Match when={getPhase() === "armed"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <Btn class="voice-follow" onClick={() => props.onSkip()}>
            Just go in
          </Btn>
        </Match>

        {/* No seconds-remaining count here - a ticking target would gamify
            the break ("beat the clock"), the one register the app avoids. */}
        <Match when={getPhase() === "tooEarly"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
          <Btn class="voice-follow" onClick={arm}>
            Try again
          </Btn>
          <Btn class="voice-follow" onClick={() => props.onSkip()}>
            Just go in
          </Btn>
        </Match>

        <Match when={getPhase() === "done"}>
          <VoiceReveal class="txtBig interaction-heading" text={heading()} />
        </Match>
      </Switch>
    </div>
  );
};

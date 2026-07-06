/* @refresh reload */
import { createSignal, JSX, Match, onCleanup, Switch } from "solid-js";
import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";
import Btn from "@src/shared/components/ui/Btn";
import {
  evaluateScreenOff,
  SCREEN_OFF_TARGET_MS,
} from "@src/shared/components/interaction/screenOff/screenOffEval";

/**
 * "Screen-Off Minute" — an Android-only strong-friction intervention that
 * asks the user to physically lock their phone for a minute. Success is
 * verified via the page `visibilitychange` event (the WebView reports hidden
 * when the screen turns off / the app is backgrounded).
 */

type ScreenOffPhase = "intro" | "armed" | "tooEarly" | "done";

/** Delay between showing the success message and closing the app. */
const DONE_EXIT_DELAY_MS = 1600;

export const ScreenOffInteraction: (props: {
  onSkip: () => void;
  onCancelCountdown: () => void;
  onLeaveNow: () => void;
}) => JSX.Element = (props) => {
  const [getPhase, setPhase] = createSignal<ScreenOffPhase>("intro");
  const [getRemainingMs, setRemainingMs] = createSignal(SCREEN_OFF_TARGET_MS);

  // Plain refs — these never need to drive rendering.
  let hiddenAt: number | undefined;
  let doneTimeoutId: number | undefined;
  let isDisposed = false;

  const completeSuccessfully = (): void => {
    // Read outside the timeout callback so the reactive `props` access does
    // not trip the solid/reactivity lint rule (as StrongFrictionBreathPause does).
    const onLeaveNow = props.onLeaveNow;
    setPhase("done");
    // Reward the user with a sun tap. Fire-and-forget: the DONE_EXIT_DELAY_MS
    // gap before the app closes is ample for the storage write to flush, and
    // awaiting it could otherwise strand the user on the success screen.
    void countSunTap().catch((error: unknown) => {
      console.error("Failed to count screen-off sun tap", error);
    });
    doneTimeoutId = window.setTimeout(() => {
      doneTimeoutId = undefined;
      if (!isDisposed) onLeaveNow();
    }, DONE_EXIT_DELAY_MS);
  };

  const handleVisibilityChange = (): void => {
    const phase = getPhase();
    // Only an active ("armed") or just-failed ("tooEarly") attempt counts —
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

    setRemainingMs(result.remainingMs);
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

  return (
    <div onmouseenter={props.onCancelCountdown}>
      <Switch>
        <Match when={getPhase() === "intro"}>
          <div class="txtBig interaction-heading">
            Put your phone down for a minute?
          </div>
          <Btn onClick={arm}>Lock my phone for a minute</Btn>
          <Btn onClick={() => props.onSkip()}>Not now</Btn>
        </Match>

        <Match when={getPhase() === "armed"}>
          <div class="txtBig interaction-heading">
            Lock your phone now — come back in a minute.
          </div>
          <Btn onClick={() => props.onSkip()}>Just go in</Btn>
        </Match>

        <Match when={getPhase() === "tooEarly"}>
          <div class="txtBig interaction-heading">
            Almost — {Math.ceil(getRemainingMs() / 1000)}s more away.
          </div>
          <Btn onClick={arm}>Try again</Btn>
          <Btn onClick={() => props.onSkip()}>Just go in</Btn>
        </Match>

        <Match when={getPhase() === "done"}>
          <div class="txtBig interaction-heading">Nice — enjoy the break.</div>
        </Match>
      </Switch>
    </div>
  );
};

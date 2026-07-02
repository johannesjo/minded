import { createSignal, JSX, Match, onCleanup, Switch } from "solid-js";
import Btn from "@src/shared/components/ui/Btn";
import { createScreenFade } from "@src/util/screenFade";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import {
  playSingleBell,
  SINGLE_BELL_FALLBACK_DURATION_MS,
} from "@src/shared/components/interaction/sun/sunAudio";
import {
  BELL_CONFIRM_FADE_MS,
  BELL_KEEP_ALIVE_TICK_MS,
  BELL_SCREEN_FADE_MS,
  BELL_SILENCE_BEFORE_CONFIRM_MS,
} from "./bell.const";

type BellPhase = "invite" | "listen";

interface BellProps {
  onSuccess: () => void;
  onCancelCountdown: () => void;
}

/**
 * The bell: one strike, listened all the way down into silence. A complete
 * attention practice with a built-in ending — nothing to count, rate, type, or
 * get "right"; the sound simply ends on its own and the user notices that it
 * has. The ring starts behind the user's own tap ("Ring it"), which both makes
 * the listening chosen rather than imposed and guarantees the browser lets the
 * audio play.
 *
 * While the bell rings the screen is deliberately empty and the one sun simply
 * keeps its quiet presence in its slot — no swell: a repeating pulse here would
 * be exactly the unguided ambient breath the fundamentals reserve for guided
 * breath pauses, and a resting sun also stays fully interactive as the
 * universal way out for the whole ring. The "It's gone" confirmation is timed
 * to the strike's real length, so even a muted edge case resolves into the
 * confirmation rather than a stuck screen.
 *
 * No skip button, mirroring urge surfing: triple-tapping (or flinging) the
 * persistent sun is the universal way out of any interaction.
 */
export const BellInteraction = (props: BellProps): JSX.Element => {
  const [getPhase, setPhase] = createSignal<BellPhase>("invite");
  const [getIsConfirmShown, setIsConfirmShown] = createSignal(false);

  const screenFade = createScreenFade(BELL_SCREEN_FADE_MS);

  let isDisposed = false;
  let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
  let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

  const stopKeepAlive = (): void => {
    if (keepAliveInterval !== undefined) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = undefined;
    }
  };

  const ring = (): void => {
    // Capture outside the async chain/interval so the reactive `props` access
    // does not trip the solid/reactivity lint rule (as UrgeSurfing does).
    const onCancelCountdown = props.onCancelCountdown;

    props.onCancelCountdown();
    screenFade.toScreen(() => setPhase("listen"));

    // Sitting still is the whole point, so no pointer input will keep the
    // parent's auto-dismiss fade from firing mid-listen — tick it away until
    // the confirmation is up.
    keepAliveInterval = setInterval(
      () => onCancelCountdown(),
      BELL_KEEP_ALIVE_TICK_MS,
    );

    void playSingleBell().then((ringMs) => {
      // The user may have left (sun-tap/fling teardown) while playback was
      // still starting up — never arm the timer into a disposed tree.
      if (isDisposed) return;
      const durationMs = ringMs ?? SINGLE_BELL_FALLBACK_DURATION_MS;
      confirmTimeout = setTimeout(() => {
        confirmTimeout = undefined;
        stopKeepAlive();
        // Sound gone → the confirmation eases in out of the silence.
        setIsConfirmShown(true);
      }, durationMs + BELL_SILENCE_BEFORE_CONFIRM_MS);
    });
  };

  onCleanup(() => {
    isDisposed = true;
    stopKeepAlive();
    if (confirmTimeout !== undefined) {
      clearTimeout(confirmTimeout);
      confirmTimeout = undefined;
    }
  });

  return (
    <div
      class="bell-interaction"
      style={{ opacity: screenFade.opacity() }}
      onMouseMove={() => props.onCancelCountdown()}
    >
      <Switch>
        <Match when={getPhase() === "invite"}>
          <div class="txtBig interaction-heading">One bell. 🔔</div>
          <p class="bell-sub">Listen until the sound has completely gone.</p>
          <Btn onClick={ring}>Ring it</Btn>
        </Match>

        <Match when={getPhase() === "listen"}>
          {/* Deliberately empty while the bell rings: the ear carries the
              moment, the sun rests quietly in its slot. The confirmation only
              eases in once the sound has died and a beat of silence has
              passed. */}
          <div
            class="bell-confirm"
            style={{
              opacity: getIsConfirmShown() ? 1 : 0,
              transition: prefersReducedMotion()
                ? "none"
                : `opacity ${BELL_CONFIRM_FADE_MS}ms ease-in-out`,
              "pointer-events": getIsConfirmShown() ? "auto" : "none",
            }}
          >
            <Btn onClick={() => props.onSuccess()}>It's gone</Btn>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default BellInteraction;

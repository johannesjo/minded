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
  /** Swell the real sun while the strike rings (the surf settle carries it). */
  onSunWaveStart: (seconds: number) => void;
  /** Settle the real sun back once the sound has died away. */
  onSunWaveEnd: () => void;
}

/**
 * The bell: one strike, listened all the way down into silence. A complete
 * attention practice with a built-in ending — nothing to count, rate, type, or
 * get "right"; the sound simply ends on its own and the user notices that it
 * has. The ring starts behind the user's own tap ("Ring it"), which both makes
 * the listening chosen rather than imposed and guarantees the browser lets the
 * audio play.
 *
 * The sun swells with the strike and settles as the sound dies (via the same
 * one-real-sun wave urge surfing rides), so on a muted edge case the moment
 * still reads as watching the glow settle — the "It's gone" confirmation is
 * true for the eye as well as the ear.
 *
 * No skip button, mirroring urge surfing: triple-tapping (or flinging) the
 * persistent sun is the universal way out of any interaction.
 */
export const BellInteraction = (props: BellProps): JSX.Element => {
  const [getPhase, setPhase] = createSignal<BellPhase>("invite");
  const [getIsConfirmShown, setIsConfirmShown] = createSignal(false);

  const screenFade = createScreenFade(BELL_SCREEN_FADE_MS);

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
    const onSunWaveEnd = props.onSunWaveEnd;

    props.onCancelCountdown();
    screenFade.toScreen(() => setPhase("listen"));
    // The swell begins as the strike lands. The bell is preloaded with the
    // other intervention sounds, so playback starts (and reports its true
    // ring length) essentially immediately.
    props.onSunWaveStart(SINGLE_BELL_FALLBACK_DURATION_MS / 1000);

    // Sitting still is the whole point, so no pointer input will reset the
    // parent's auto-dismiss — keep it at bay until the confirmation is up.
    keepAliveInterval = setInterval(
      () => onCancelCountdown(),
      BELL_KEEP_ALIVE_TICK_MS,
    );

    void playSingleBell().then((ringMs) => {
      const durationMs = ringMs ?? SINGLE_BELL_FALLBACK_DURATION_MS;
      confirmTimeout = setTimeout(() => {
        confirmTimeout = undefined;
        stopKeepAlive();
        // Sound gone → the sun settles → the confirmation eases in out of the
        // silence, in that order.
        onSunWaveEnd();
        setIsConfirmShown(true);
      }, durationMs + BELL_SILENCE_BEFORE_CONFIRM_MS);
    });
  };

  onCleanup(() => {
    stopKeepAlive();
    if (confirmTimeout !== undefined) {
      clearTimeout(confirmTimeout);
      confirmTimeout = undefined;
    }
  });

  return (
    <div
      class="bell-interaction"
      classList={{ "is-listening": getPhase() === "listen" }}
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
          {/* Deliberately empty while the bell rings: the ear (and the swelling
              sun) carry the moment. The confirmation only eases in once the
              sound has died and a beat of silence has passed. */}
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

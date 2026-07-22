import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import styles from "./GroundingOverlay.module.scss";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import Stars from "@src/shared/components/interaction/backgroundTransition/Stars";
import { playGong } from "@src/shared/components/interaction/sun/sunAudio";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import {
  ANDROID_LOCK_DELAY_MS,
  GROUNDING_FADE_MS,
  OFFER_AUTO_DISMISS_MS,
  QUIET_MINUTE_OPTIONS,
  SCREEN_FADE_MS,
  SETTLE_DURATION_MS,
  SKY_SETTLE_MS,
  TIMER_MINUTE_OPTIONS,
} from "@src/shared/components/interaction/grounding/grounding.const";
import Btn from "@src/shared/components/ui/Btn";
import { createScreenFade } from "@src/util/screenFade";

type Phase = "offer" | "duration" | "session" | "settle" | "androidLock";
type Mode = "timer" | "quiet";

interface GroundingOverlayProps {
  /** "sun" (light) or "moon" (dark) - matches the dashboard theme. */
  variant: "sun" | "moon";
  /** Called once the flow is finished (completed, declined, or ignored). */
  onClose: () => void;
  /** Move keyboard focus into the offer when a keyboard gesture opened it. */
  focusOnMount?: boolean;
  /**
   * How the dashboard's single shell sun should behave through this stage - the
   * one disc carries the whole flow rather than a second one being drawn:
   * - "companion": rest on the bottom bar beneath the invitation (offer/duration)
   *   or glide home there beneath the closing praise.
   * - "meditate": rise into the centre and breathe as the timed sit's breath sun
   *   (the surfing meditation settle - the same gentle pulse the other meditations
   *   use), so the sit reads as the same sun the user always sees.
   * - "hidden": tuck away while a screen-free sit / Android lock owns the screen.
   * Provided only by the shell-sun dashboard; its *presence* also tells this
   * overlay the shell sun exists, so the timed sit reuses it instead of drawing
   * its own disc. Absent in the styleguide preview, which falls back to a local
   * BreathSun.
   */
  onSunMode?: (mode: "companion" | "meditate" | "hidden") => void;
}

/**
 * The grounding offer the dashboard sun gives when dragged *down*. It is an
 * invitation, never a trap: declining is as easy as accepting, doing nothing
 * dismisses it, and any sit can be ended early. Two ways to ground yourself -
 * eyes on a calm anchor (timer) or eyes off entirely (screen-free).
 */
export const GroundingOverlay: Component<GroundingOverlayProps> = (props) => {
  const [getPhase, setPhase] = createSignal<Phase>("offer");
  const [getMode, setMode] = createSignal<Mode>("timer");
  const [getIsClosing, setIsClosing] = createSignal(false);
  const [getSkySettled, setSkySettled] = createSignal(false);
  const [getRemainingMs, setRemainingMs] = createSignal(0);
  // Set the moment the user touches or keyboard-focuses the offer: someone
  // mid-decision is engaged, and the gentle auto-dismiss below must never
  // whisk the offer away from under them (mirrors LetGoOverlay's onEngage).
  const [getHasEngaged, setHasEngaged] = createSignal(false);

  // The shell-sun dashboard wires onSunMode; its presence means the one shell sun
  // is available to carry this stage, so the timed sit reuses it as its breath sun
  // rather than drawing its own. (Absent in the styleguide preview - see the
  // BreathSun fallback in the timed-sit render.)
  const usesMainSun = () => !!props.onSunMode;

  let intervalId: number | undefined;
  let endTimeout: number | undefined;
  let closeTimeout: number | undefined;
  let settleTimeout: number | undefined;
  let lockTimeout: number | undefined;
  let settleRaf: number | undefined;
  let focusRaf: number | undefined;
  let rootEl: HTMLDivElement | undefined;
  let isDisposed = false;
  // Set the instant a sit ends so the "End" tap and the end timer (which can
  // both land) only ring the gong and advance once. (The old guard read the
  // phase, but the phase swap is now deferred to the screen fade's midpoint, so a
  // synchronous flag is needed.)
  let finishing = false;

  // The grounding stage's own screens (offer / duration / sit / settle) crossfade
  // through this instead of hard-cutting: toScreen fades the current screen out,
  // runs the swap (setPhase + its gong / timers) at the hidden midpoint so they
  // land with the new screen, then fades back in. Soft, never a jolt.
  const screenFade = createScreenFade(SCREEN_FADE_MS);

  // Stop the timed sit's 1 Hz countdown and its authoritative end timer.
  const stopTimers = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = undefined;
    }
    if (endTimeout) {
      window.clearTimeout(endTimeout);
      endTimeout = undefined;
    }
  };

  // Drive the one shell sun through the stage (see InteractionCommon's onSunMode):
  // it rests at the bottom beneath the invitation (offer/duration) and glides home
  // there through the wordless settle beat ("companion"); it rises into the centre and
  // breathes as the timed sit's breath sun ("meditate"); it tucks away while a
  // screen-free sit / Android lock owns the near-black screen ("hidden"). The timed
  // sit is the morph the user sees - the companion disc rises and breathes rather
  // than a second disc popping in.
  createEffect(() => {
    const phase = getPhase();
    const isTimer = getMode() === "timer";
    const mode =
      phase === "offer" || phase === "duration" || phase === "settle"
        ? "companion"
        : phase === "session" && isTimer
          ? "meditate"
          : "hidden";
    props.onSunMode?.(mode);
  });

  // The down-drag's warm sunset (light) / night sky (dark) carries in with the
  // offer - opaque and pixel-identical to the drag, so the hand-off reads as one
  // continuous motion, no flash - and then eases straight back to the dashboard's
  // own calm sky. "Stay a while" is a place to rest, not a sunset to dwell in, so
  // the dissolve starts the moment the offer mounts (no hold on the sunset) and
  // runs slowly over SKY_SETTLE_MS (the .skySettled rule eases the ::before to 0).
  // Two rAFs so the carried-in sunset paints once before .skySettled flips it -
  // otherwise the browser coalesces the change and hard-cuts to standard.
  settleRaf = requestAnimationFrame(() => {
    settleRaf = requestAnimationFrame(() => {
      settleRaf = undefined;
      if (!isDisposed) setSkySettled(true);
    });
  });

  onMount(() => {
    if (!props.focusOnMount) return;
    focusRaf = requestAnimationFrame(() => {
      focusRaf = undefined;
      if (!isDisposed) rootEl?.focus();
    });
  });

  // A gentle offer never nags: if it is left untouched it fades on its own.
  // "Untouched" is literal - the first touch or keyboard focus cancels the
  // countdown, so the offer never disappears mid-decision.
  createEffect(() => {
    if (getPhase() !== "offer" || getHasEngaged()) return;
    const t = window.setTimeout(() => {
      if (!isDisposed) close();
    }, OFFER_AUTO_DISMISS_MS);
    onCleanup(() => window.clearTimeout(t));
  });

  const close = () => {
    if (getIsClosing()) return;
    setIsClosing(true);
    stopTimers();
    closeTimeout = window.setTimeout(() => {
      if (!isDisposed) props.onClose();
    }, GROUNDING_FADE_MS);
  };

  const chooseMode = (mode: Mode) => {
    setMode(mode);
    // The most grounding thing on a phone is getting the screen out of the way
    // entirely, so the screen-free sit locks the phone rather than running an
    // on-screen timer. Lock right away (after the gong); a timer you can't see
    // is pointless. On the web there's no phone to put away - dim instead.
    if (mode === "quiet" && IS_ANDROID) {
      startAndroidLock();
      return;
    }
    screenFade.toScreen(() => setPhase("duration"));
  };

  const startAndroidLock = () => {
    // Fade to the send-off, then ring the gong and start the lock countdown as it
    // appears (not over the fading-out offer).
    screenFade.toScreen(() => {
      setPhase("androidLock");
      void playGong();
      lockTimeout = window.setTimeout(() => {
        lockTimeout = undefined;
        if (isDisposed) return;
        if (IS_ANDROID) androidInterface.lockScreen();
        close();
      }, ANDROID_LOCK_DELAY_MS);
    });
  };

  const startSession = (minutes: number) => {
    const durationMs = minutes * 60 * 1000;
    // Fade to the sit, then mark the threshold into stillness and start the clock
    // as it lands - the gong and countdown begin with the screen, not before it.
    screenFade.toScreen(() => {
      setRemainingMs(durationMs);
      setPhase("session");
      void playGong();

      // A 1 Hz interval is all the countdown needs: the remaining-time label only
      // changes once a second, so sampling per animation frame (~60x/sec) would
      // repaint for no visible gain.
      const startTs = Date.now();
      intervalId = window.setInterval(() => {
        const elapsed = Date.now() - startTs;
        setRemainingMs(Math.max(0, durationMs - elapsed));
      }, 1000);
      // The end is its own timer, not a branch of the interval: a backgrounded tab
      // throttles or pauses the visual ticks, but setTimeout still fires, so the
      // closing gong reliably calls you back even if the countdown was frozen.
      endTimeout = window.setTimeout(finishSession, durationMs);
    });
  };

  const finishSession = () => {
    // Idempotent (see `finishing`): the "End" tap and the end timer can both land
    // (or End can be double-tapped); only the first call rings the gong and
    // advances. A flag, not a phase read - the phase swap is deferred to the fade.
    if (finishing || getIsClosing()) return;
    finishing = true;
    stopTimers();
    // The gong calls you back - ring it the instant the sit ends, then fade out.
    void playGong();
    if (getMode() === "timer") {
      screenFade.toScreen(() => {
        setPhase("settle");
        settleTimeout = window.setTimeout(() => {
          if (!isDisposed) close();
        }, SETTLE_DURATION_MS);
      });
    } else {
      // Screen-free: nothing on screen to close - the disconnect carries itself.
      close();
    }
  };

  onCleanup(() => {
    isDisposed = true;
    stopTimers();
    if (closeTimeout) window.clearTimeout(closeTimeout);
    if (settleTimeout) window.clearTimeout(settleTimeout);
    if (lockTimeout) window.clearTimeout(lockTimeout);
    if (settleRaf) cancelAnimationFrame(settleRaf);
    if (focusRaf) cancelAnimationFrame(focusRaf);
  });

  // The screen-free sit (and its Android lock send-off) dims almost to black so
  // the eyes can truly rest - the one stage where the night sky should recede.
  const isQuietPhase = () =>
    getMode() === "quiet" &&
    (getPhase() === "session" || getPhase() === "androidLock");

  const remainingLabel = () => {
    const totalSec = Math.ceil(getRemainingMs() / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={rootEl}
      class={styles.grounding}
      role="group"
      aria-label="Stay a while"
      tabIndex={-1}
      classList={{
        [styles.isQuiet]: isQuietPhase(),
        [styles.isClosing]: getIsClosing(),
        [styles.skySettled]: getSkySettled(),
      }}
      onPointerDown={() => setHasEngaged(true)}
      onFocusIn={() => setHasEngaged(true)}
      style={{
        "--grounding-fade-ms": `${GROUNDING_FADE_MS}ms`,
        "--sky-settle-ms": `${SKY_SETTLE_MS}ms`,
        "--screen-fade-ms": `${SCREEN_FADE_MS}ms`,
      }}
    >
      {/* The living sky the down-drag revealed carries through onto the
          grounding stage instead of a flat gradient: at night the same
          twinkling stars, by day their counterpart - warm motes of light
          adrift in the golden sky (Stars' day variant). It's part of the
          overlay's own backdrop, so it fades in and out with the stage (no
          separate layer to flash on close). */}
      <div class={styles.starfield} aria-hidden="true">
        {/* Gentle twinkle/drift only - no shooting-star flourish: a meteor
            streaking across the frame would read as a jolt, not calm, behind a
            settling sit. Intensity drops to 0 for the screen-free sit's
            near-black dim, which both recedes the field and stops its
            animations (see Stars). */}
        <Stars
          intensity={isQuietPhase() ? 0 : 1}
          shootingStars={false}
          variant={props.variant === "moon" ? "night" : "day"}
        />
      </div>

      {/* The active screen. Crossfaded as the stage moves between offer →
          duration → sit → settle (screenFade), so the swap is soft, never a hard
          cut. The sky (::before), the stars above, and the shell sun (its own
          layer) sit outside this and don't fade per screen. */}
      <div class={styles.screen} style={{ opacity: screenFade.opacity() }}>
        {/* Offer - "Stay a while?" with two ways to ground, and an easy decline. */}
        <Show when={getPhase() === "offer"}>
          <div class={styles.panel}>
            <h2 class={styles.title}>Stay a while?</h2>
            <p class={styles.subtitle}>Take a moment to ground yourself.</p>
            <div class={styles.choices}>
              <Btn onClick={() => chooseMode("timer")}>
                Meditate with a timer
              </Btn>
              <Btn onClick={() => chooseMode("quiet")}>
                {IS_ANDROID ? "Put your phone down" : "Be present, screen-free"}
              </Btn>
            </div>
            <Btn outline onClick={close}>
              Not now
            </Btn>
          </div>
        </Show>

        {/* Duration - a small ladder for the chosen mode. */}
        <Show when={getPhase() === "duration"}>
          <div class={styles.panel}>
            <h2 class={styles.title}>
              {getMode() === "timer" ? "How long?" : "Be present for…"}
            </h2>
            <div class={styles.durations}>
              {(getMode() === "timer"
                ? TIMER_MINUTE_OPTIONS
                : QUIET_MINUTE_OPTIONS
              ).map((min) => (
                <Btn variant="toggle" onClick={() => startSession(min)}>
                  {min} min
                </Btn>
              ))}
            </div>
            <Btn onClick={close}>Not now</Btn>
          </div>
        </Show>

        {/* Timed sit - the one sun breathes at the centre, the remaining time and
          End tucked just beneath it (mirrors the urge-surf meditation). The
          breathing disc IS the shell sun, risen from its companion rest (see the
          onSunMode effect); only the styleguide preview, which has no shell sun,
          stands in with a local BreathSun. */}
        <Show when={getPhase() === "session" && getMode() === "timer"}>
          <div
            class={styles.session}
            classList={{ [styles.sessionMeditate]: usesMainSun() }}
          >
            <Show when={!usesMainSun()}>
              <BreathSun fill={1} size="large" variant={props.variant} />
            </Show>
            <p class={styles.remaining}>{remainingLabel()}</p>
            <Btn onClick={finishSession}>End</Btn>
          </div>
        </Show>

        {/* Screen-free sit - eyes off; the bell calls you back. */}
        <Show when={getPhase() === "session" && getMode() === "quiet"}>
          <div class={styles.session}>
            <p class={styles.quietCue}>Rest your eyes.</p>
            <p class={styles.quietSub}>The bell will call you back.</p>
            <Btn onClick={finishSession}>End</Btn>
          </div>
        </Show>

        {/* Android: a brief send-off before the phone locks. */}
        <Show when={getPhase() === "androidLock"}>
          <div class={styles.session}>
            <p class={styles.quietCue}>Put your phone down.</p>
            <p class={styles.quietSub}>Be present for a little while.</p>
          </div>
        </Show>

        {/* A finished timed sit closes on a wordless settle beat - no praise, no
            verdict. The sun glides home to the bottom bar and the sky settles;
            the morph carries the close (see #164). */}
      </div>
    </div>
  );
};

export default GroundingOverlay;

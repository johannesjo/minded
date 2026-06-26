import {
  Component,
  createEffect,
  createSignal,
  onCleanup,
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
  PRAISE_DURATION_MS,
  QUIET_MINUTE_OPTIONS,
  TIMER_MINUTE_OPTIONS,
} from "@src/shared/components/interaction/grounding/grounding.const";
import Btn from "@src/shared/components/ui/Btn";

type Phase = "offer" | "duration" | "session" | "praise" | "androidLock";
type Mode = "timer" | "quiet";

interface GroundingOverlayProps {
  /** "sun" (light) or "moon" (dark) — matches the dashboard theme. */
  variant: "sun" | "moon";
  /** Called once the flow is finished (completed, declined, or ignored). */
  onClose: () => void;
  /**
   * Whether the dashboard's companion sun should rest at the bottom beneath this
   * stage. True while the invitation/choice screens show (offer, duration) so the
   * sun stays with the offer; false once a sit takes over (session, androidLock,
   * praise) — those stages own the screen (their own breath sun, or a near-black
   * dim), so the companion sun is tucked away to keep a single sun on screen.
   * Optional — only the shell-sun dashboard wires it up.
   */
  onShowPersistentSun?: (show: boolean) => void;
}

const RING_RADIUS = 140;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The grounding offer the dashboard sun gives when dragged *down*. It is an
 * invitation, never a trap: declining is as easy as accepting, doing nothing
 * dismisses it, and any sit can be ended early. Two ways to ground yourself —
 * eyes on a calm anchor (timer) or eyes off entirely (screen-free).
 */
export const GroundingOverlay: Component<GroundingOverlayProps> = (props) => {
  const [getPhase, setPhase] = createSignal<Phase>("offer");
  const [getMode, setMode] = createSignal<Mode>("timer");
  const [getIsClosing, setIsClosing] = createSignal(false);
  const [getProgress, setProgress] = createSignal(0);
  const [getRemainingMs, setRemainingMs] = createSignal(0);

  let intervalId: number | undefined;
  let endTimeout: number | undefined;
  let closeTimeout: number | undefined;
  let praiseTimeout: number | undefined;
  let lockTimeout: number | undefined;
  let isDisposed = false;

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

  // The dashboard's companion sun rests at the bottom beneath this stage (see
  // InteractionCommon). Keep it there only while we're still inviting — the
  // offer and duration choice screens. Once a sit begins (session / androidLock /
  // praise) the stage owns the screen with its own sun or a near-black dim, so
  // the companion is tucked away to keep a single sun on screen.
  createEffect(() => {
    const phase = getPhase();
    props.onShowPersistentSun?.(phase === "offer" || phase === "duration");
  });

  // A gentle offer never nags: if it is left untouched it fades on its own.
  createEffect(() => {
    if (getPhase() !== "offer") return;
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
    // is pointless. On the web there's no phone to put away — dim instead.
    if (mode === "quiet" && IS_ANDROID) {
      startAndroidLock();
      return;
    }
    setPhase("duration");
  };

  const startAndroidLock = () => {
    setPhase("androidLock");
    void playGong();
    lockTimeout = window.setTimeout(() => {
      lockTimeout = undefined;
      if (isDisposed) return;
      if (IS_ANDROID) androidInterface.lockScreen();
      close();
    }, ANDROID_LOCK_DELAY_MS);
  };

  const startSession = (minutes: number) => {
    const durationMs = minutes * 60 * 1000;
    setRemainingMs(durationMs);
    setProgress(0);
    setPhase("session");
    // A clear tone marks the threshold into stillness.
    void playGong();

    // A 1 Hz interval is all the countdown needs: the label only changes once a
    // second and the ring has a 0.3s CSS transition that smooths each step, so
    // sampling per animation frame (~60x/sec) would repaint for no visible gain.
    const startTs = Date.now();
    intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startTs;
      setProgress(Math.min(1, elapsed / durationMs));
      setRemainingMs(Math.max(0, durationMs - elapsed));
    }, 1000);
    // The end is its own timer, not a branch of the interval: a backgrounded tab
    // throttles or pauses the visual ticks, but setTimeout still fires, so the
    // closing gong reliably calls you back even if the countdown was frozen.
    endTimeout = window.setTimeout(finishSession, durationMs);
  };

  const finishSession = () => {
    // Idempotent: the "End" tap and the end timer can both land (or End can be
    // double-tapped); only the first call should ring the gong and advance.
    if (getIsClosing() || getPhase() === "praise") return;
    stopTimers();
    // The gong calls you back.
    void playGong();
    if (getMode() === "timer") {
      setPhase("praise");
      praiseTimeout = window.setTimeout(() => {
        if (!isDisposed) close();
      }, PRAISE_DURATION_MS);
    } else {
      // Screen-free: no on-screen praise — the disconnect is its own reward.
      close();
    }
  };

  onCleanup(() => {
    isDisposed = true;
    stopTimers();
    if (closeTimeout) window.clearTimeout(closeTimeout);
    if (praiseTimeout) window.clearTimeout(praiseTimeout);
    if (lockTimeout) window.clearTimeout(lockTimeout);
  });

  // The screen-free sit (and its Android lock send-off) dims almost to black so
  // the eyes can truly rest — the one stage where the night sky should recede.
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
      class={styles.grounding}
      classList={{
        [styles.isQuiet]: isQuietPhase(),
        [styles.isClosing]: getIsClosing(),
      }}
      style={{ "--grounding-fade-ms": `${GROUNDING_FADE_MS}ms` }}
    >
      {/* Night mode keeps the dashboard's sparkling sky: the same twinkling stars
          the down-drag reveals carry through onto the grounding stage instead of a
          flat gradient. It's part of the overlay's own backdrop, so it fades in and
          out with the stage (no separate layer to flash on close). Only the moon
          variant — the morning sky has no stars — and it recedes for the near-black
          screen-free sit. */}
      <Show when={props.variant === "moon"}>
        <div
          class={styles.starfield}
          classList={{ [styles.starfieldHidden]: isQuietPhase() }}
          aria-hidden="true"
        >
          <Stars intensity={1} />
        </div>
      </Show>

      {/* Offer — "Stay a while?" with two ways to ground, and an easy decline. */}
      <Show when={getPhase() === "offer"}>
        <div class={styles.panel}>
          <h2 class={styles.title}>Stay a while?</h2>
          <p class={styles.subtitle}>Take a moment to ground yourself.</p>
          <div class={styles.choices}>
            <Btn onClick={() => chooseMode("timer")}>Meditate with a timer</Btn>
            <Btn onClick={() => chooseMode("quiet")}>
              {IS_ANDROID ? "Put your phone down" : "Be present, screen-free"}
            </Btn>
          </div>
          <Btn outline onClick={close}>
            Not now
          </Btn>
        </div>
      </Show>

      {/* Duration — a small ladder for the chosen mode. */}
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

      {/* Timed sit — a still, softly glowing sun and a quiet progress ring. */}
      <Show when={getPhase() === "session" && getMode() === "timer"}>
        <div class={styles.session}>
          <div class={styles.ring}>
            <svg
              class={styles.ringSvg}
              viewBox="0 0 300 300"
              aria-hidden="true"
            >
              <circle
                class={styles.ringTrack}
                cx="150"
                cy="150"
                r={RING_RADIUS}
              />
              <circle
                class={styles.ringProgress}
                cx="150"
                cy="150"
                r={RING_RADIUS}
                stroke-dasharray={RING_CIRCUMFERENCE}
                stroke-dashoffset={RING_CIRCUMFERENCE * (1 - getProgress())}
              />
            </svg>
            <div class={styles.ringInner}>
              <BreathSun fill={1} size="large" variant={props.variant} />
            </div>
          </div>
          <p class={styles.remaining}>{remainingLabel()}</p>
          <Btn onClick={finishSession}>End</Btn>
        </div>
      </Show>

      {/* Screen-free sit — eyes off; the bell calls you back. */}
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

      {/* Earned praise after a finished timed sit. */}
      <Show when={getPhase() === "praise"}>
        <div class={styles.praise}>Be proud!</div>
      </Show>
    </div>
  );
};

export default GroundingOverlay;

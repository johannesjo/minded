import { createSignal, JSX, onCleanup } from "solid-js";
import Btn from "@src/shared/components/ui/Btn";
import { StrongFrictionBreathPause } from "@src/shared/components/interaction/breathPause/StrongFrictionBreathPause";
import { STRONG_FRICTION_BREATH_PAUSE_SECONDS } from "@src/shared/components/interaction/postSunPause";

/** Keep the parent's auto-dismiss countdown at bay while the breath runs
 *  without any pointer input (same job as urge surfing's wave tick). */
const KEEP_ALIVE_MS = 1000;

interface BreathInteractionProps {
  onSuccess: () => void;
  onCancelCountdown: () => void;
  /** Glide the real sun to its breath anchor and swell it once (in → hold → out). */
  onSunBreathStart: () => void;
  /** Return the real sun from the breath to the interactive disc. */
  onSunBreathEnd: () => void;
}

/**
 * BREATH: one slow guided breath, led by the sun, as an everyday intervention.
 *
 * The one practice the app can genuinely *lead* rather than merely name -
 * printed as a NOTICE cue it would be the weak form (see notice.const.ts), but
 * here the disc is standing right there to lead it. Reuses the strong-friction
 * pause wholesale: the same `breathing` settle on the one real sun, the same
 * `StrongFrictionBreathPause` copy reading the same published breath clock -
 * a new doorway into existing machinery, never a second breath implementation
 * (the line docs/reflective-companion-concept.md holds).
 *
 * Invitation first, never an ambush: the breath starts on a tap, not on mount.
 * Auto-starting would settle the sun - the universal way out - for twelve
 * seconds the user never agreed to, which is the forced shape minded refuses.
 * While the invite is up the sun stays interactive, so fling/drag/tap all work.
 */
export const BreathInteraction = (
  props: BreathInteractionProps,
): JSX.Element => {
  const [getPhase, setPhase] = createSignal<"invite" | "breath">("invite");
  // Set at completion: the pause stays mounted through the success fade (an
  // unmount would cut it), so its cancel button needs to become a no-op.
  let hasFinished = false;
  let keepAliveId: ReturnType<typeof setInterval> | undefined;

  const stopKeepAlive = (): void => {
    if (keepAliveId !== undefined) {
      clearInterval(keepAliveId);
      keepAliveId = undefined;
    }
  };

  const begin = (): void => {
    // Capture outside the interval so the reactive `props` access doesn't trip
    // the solid/reactivity lint rule (as UrgeSurfing does).
    const onCancelCountdown = props.onCancelCountdown;
    onCancelCountdown();
    props.onSunBreathStart();
    setPhase("breath");
    stopKeepAlive();
    keepAliveId = setInterval(() => onCancelCountdown(), KEEP_ALIVE_MS);
  };

  const finish = (): void => {
    if (hasFinished) return;
    hasFinished = true;
    stopKeepAlive();
    // Hand the disc back before the success beat: the sun-instructions step
    // that follows needs the interactive sun, so it glides home from the
    // breath anchor while the copy fades - one sun, one motion.
    props.onSunBreathEnd();
    props.onSuccess();
  };

  const cancel = (): void => {
    if (hasFinished) return;
    stopKeepAlive();
    props.onCancelCountdown();
    props.onSunBreathEnd();
    // Back to the invitation, sun interactive again - leaving the breath is
    // not leaving the intervention (the sun remains the way out of that).
    setPhase("invite");
  };

  onCleanup(() => {
    stopKeepAlive();
    // Only while *our* breath is running is the settled sun ours to return: a
    // blanket reset here would yank the sun out of whatever settle a later
    // stage of the flow (the post-tap intent breath, say) has put it in.
    if (getPhase() === "breath" && !hasFinished) {
      props.onSunBreathEnd();
    }
  });

  return (
    <div
      id="minded-6622-breath"
      class="breath-interaction"
      onMouseMove={props.onCancelCountdown}
    >
      {getPhase() === "invite" ? (
        <>
          <div class="txtBig breath-invite-cue">Take one slow breath.</div>
          {/* No "skip": triple-tapping (or flinging) the persistent sun is the
              universal way out of any interaction, same as urge surfing. */}
          <Btn voice style={{ "margin-top": "24px" }} onClick={begin}>
            breathe
          </Btn>
        </>
      ) : (
        <StrongFrictionBreathPause
          seconds={STRONG_FRICTION_BREATH_PAUSE_SECONDS}
          onComplete={finish}
          onCancel={cancel}
        />
      )}
    </div>
  );
};

export default BreathInteraction;

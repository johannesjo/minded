import { createSignal, JSX, onCleanup } from "solid-js";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import {
  FINGER_REST_CONFIRM_MS,
  FINGER_REST_CUE_FADE_MS,
  FINGER_REST_KEEP_ALIVE_TICK_MS,
  FINGER_REST_MIN_MS,
  FINGER_REST_WARMTH_IN_MS,
  FINGER_REST_WARMTH_OUT_MS,
} from "./fingerRest.const";

interface FingerRestProps {
  onSuccess: () => void;
  onCancelCountdown: () => void;
}

/**
 * The near-wordless intervention: an invitation for the scrolling finger - the
 * very organ of the habit - to simply be still for a moment. The invitation
 * names the why (the finger that scrolls, at rest), the how (press and stay),
 * and where the attention goes (feel it there) so a first-time meeting isn't a
 * guess, and a soft outlined pad shows exactly where to lay the finger down.
 * Press anywhere on the pad and rest; the
 * words and the outline dissolve, a warmth gathers under the fingertip, and
 * lifting continues on. Nothing is counted, timed on screen, or scored, and -
 * true to the wordless heart of it - there is nothing left to read once it has
 * begun; only the warmth remains. When the rest is long enough, lifting is met
 * by a single soft bloom of that warmth - a wordless "received" - and the words
 * stay gone; a too-short brush instead just lets the invitation fade back.
 *
 * Deliberately NOT a hold-to-unlock gate (the attention-check dark pattern):
 * no progress ring, no announced duration, and release is always free - a
 * quick accidental brush just lets the invitation return. The rest zone is the
 * invitation itself, not the sun: the persistent sun keeps its own gestures
 * (tap ×3 / fling / drag) as the universal way through, and per the
 * fundamentals its calm stays a quiet presence - the warmth here responds
 * monotonically to the touch, never as a rhythmic breath.
 */
export const FingerRestInteraction = (props: FingerRestProps): JSX.Element => {
  const [getIsResting, setIsResting] = createSignal(false);
  // A completed rest: the finger has lifted after staying long enough. The
  // words never come back from here - the warmth blooms once as the "received"
  // and the surface hands off to the parent's success fade.
  const [getIsConfirmed, setIsConfirmed] = createSignal(false);

  let restStartTS: number | undefined;
  let restingPointerId: number | undefined;
  let keepAliveInterval: ReturnType<typeof setInterval> | undefined;

  const stopKeepAlive = (): void => {
    if (keepAliveInterval !== undefined) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = undefined;
    }
  };

  const handleRestStart = (e: PointerEvent): void => {
    // One rest at a time: a second fingertip brushing the zone mid-rest must
    // not restart the clock or orphan the keep-alive interval - the first
    // finger keeps the rest, and only its lift ends it (pointer-id checks in
    // the end handlers below).
    if (getIsResting()) return;
    // Keep the press from starting text selection / the long-press callout,
    // and keep receiving the pointer even if the resting finger drifts.
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    restingPointerId = e.pointerId;

    // Capture outside the interval so the reactive `props` access does not
    // trip the solid/reactivity lint rule (as UrgeSurfing does).
    const onCancelCountdown = props.onCancelCountdown;
    props.onCancelCountdown();
    restStartTS = Date.now();
    setIsResting(true);
    // A resting finger produces no events, so keep the parent's auto-dismiss
    // at bay for as long as it stays.
    keepAliveInterval = setInterval(
      () => onCancelCountdown(),
      FINGER_REST_KEEP_ALIVE_TICK_MS,
    );
  };

  const handleRestEnd = (e: PointerEvent): void => {
    if (!getIsResting() || e.pointerId !== restingPointerId) return;
    restingPointerId = undefined;
    stopKeepAlive();
    const restedMs = restStartTS !== undefined ? Date.now() - restStartTS : 0;
    restStartTS = undefined;
    if (restedMs >= FINGER_REST_MIN_MS) {
      // Long enough: `isConfirmed` holds the words and pad hidden and the warmth
      // lit through the parent's success fade (see the opacity gates in the
      // render), so the invitation never snaps back. Set it before clearing
      // `isResting` as a belt-and-braces guard against any transient tick where
      // both flags read false; the warmth then blooms once as the "received".
      setIsConfirmed(true);
      setIsResting(false);
      props.onSuccess();
      return;
    }
    // Shorter was a tap, not a rest: let the invitation ease back in.
    setIsResting(false);
  };

  const handleRestInterrupted = (e: PointerEvent): void => {
    // The system took the pointer (gesture, palm rejection) - that is not a
    // chosen lift, so never complete from here; just return to the invitation.
    if (e.pointerId !== restingPointerId) return;
    restingPointerId = undefined;
    stopKeepAlive();
    setIsResting(false);
    restStartTS = undefined;
  };

  onCleanup(stopKeepAlive);

  return (
    <div class="finger-rest" onMouseMove={() => props.onCancelCountdown()}>
      <div
        class="finger-rest-zone"
        onPointerDown={handleRestStart}
        onPointerUp={handleRestEnd}
        onPointerCancel={handleRestInterrupted}
      >
        {/* The soft outline that shows where to lay the finger down. It fades
            with the words as stillness begins - once resting, the warmth alone
            marks the spot - and stays gone once a rest has completed. */}
        <div
          class="finger-rest-pad"
          aria-hidden="true"
          style={{
            opacity: getIsResting() || getIsConfirmed() ? 0 : 1,
            transition: prefersReducedMotion()
              ? "none"
              : `opacity ${FINGER_REST_CUE_FADE_MS}ms ease-in-out`,
          }}
        />
        <div
          class="finger-rest-warmth"
          aria-hidden="true"
          style={{
            opacity: getIsResting() || getIsConfirmed() ? 1 : 0,
            transition: prefersReducedMotion()
              ? "none"
              : `opacity ${
                  getIsResting()
                    ? FINGER_REST_WARMTH_IN_MS
                    : FINGER_REST_WARMTH_OUT_MS
                }ms ease-in-out`,
          }}
        />
        {/* The "received": a single soft bloom of the companion's light that
            swells outward once and dissolves when a rest completes - the calm
            confirmation in place of the words snapping back. One-shot only, and
            skipped under reduced motion, where the steady warmth carries it. */}
        {getIsConfirmed() && !prefersReducedMotion() && (
          <div
            class="finger-rest-bloom"
            aria-hidden="true"
            style={{ "animation-duration": `${FINGER_REST_CONFIRM_MS}ms` }}
          />
        )}
        {/* Cue and its why/how share one fade: everything to read dissolves the
            moment stillness begins, and stays gone once a rest has completed. */}
        <div
          class="finger-rest-cue"
          style={{
            opacity: getIsResting() || getIsConfirmed() ? 0 : 1,
            transition: prefersReducedMotion()
              ? "none"
              : `opacity ${FINGER_REST_CUE_FADE_MS}ms ease-in-out`,
          }}
        >
          <div class="txtBig">Let your finger rest here.</div>
          <div class="finger-rest-why">
            Press and stay. Feel the finger that keeps scrolling, now still.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerRestInteraction;

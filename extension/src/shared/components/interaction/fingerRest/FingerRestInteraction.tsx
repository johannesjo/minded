import { createSignal, JSX, onCleanup } from "solid-js";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import {
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
 * The near-wordless intervention: an invitation for the scrolling finger — the
 * very organ of the habit — to simply be still for a moment. The invitation
 * names both the why (the finger that scrolls, at rest) and the how (press and
 * stay) so a first-time meeting isn't a guess, and a soft outlined pad shows
 * exactly where to lay the finger down. Press anywhere on the pad and rest; the
 * words and the outline dissolve, a warmth gathers under the fingertip, and
 * lifting continues on. Nothing is counted, timed on screen, or scored, and —
 * true to the wordless heart of it — there is nothing left to read once it has
 * begun; only the warmth remains.
 *
 * Deliberately NOT a hold-to-unlock gate (the attention-check dark pattern):
 * no progress ring, no announced duration, and release is always free — a
 * quick accidental brush just lets the invitation return. The rest zone is the
 * invitation itself, not the sun: the persistent sun keeps its own gestures
 * (tap ×3 / fling / drag) as the universal way through, and per the
 * fundamentals its calm stays a quiet presence — the warmth here responds
 * monotonically to the touch, never as a rhythmic breath.
 */
export const FingerRestInteraction = (props: FingerRestProps): JSX.Element => {
  const [getIsResting, setIsResting] = createSignal(false);

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
    // not restart the clock or orphan the keep-alive interval — the first
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
    setIsResting(false);
    const restedMs = restStartTS !== undefined ? Date.now() - restStartTS : 0;
    restStartTS = undefined;
    if (restedMs >= FINGER_REST_MIN_MS) {
      props.onSuccess();
    }
    // Shorter was a tap, not a rest: the invitation has already begun fading
    // back in via the signal above; no nudge, no message.
  };

  const handleRestInterrupted = (e: PointerEvent): void => {
    // The system took the pointer (gesture, palm rejection) — that is not a
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
        classList={{ "is-resting": getIsResting() }}
        onPointerDown={handleRestStart}
        onPointerUp={handleRestEnd}
        onPointerCancel={handleRestInterrupted}
      >
        {/* The soft outline that shows where to lay the finger down. It fades
            with the words as stillness begins — once resting, the warmth alone
            marks the spot. */}
        <div
          class="finger-rest-pad"
          aria-hidden="true"
          style={{
            opacity: getIsResting() ? 0 : 1,
            transition: prefersReducedMotion()
              ? "none"
              : `opacity ${FINGER_REST_CUE_FADE_MS}ms ease-in-out`,
          }}
        />
        <div
          class="finger-rest-warmth"
          aria-hidden="true"
          style={{
            opacity: getIsResting() ? 1 : 0,
            transition: prefersReducedMotion()
              ? "none"
              : `opacity ${
                  getIsResting()
                    ? FINGER_REST_WARMTH_IN_MS
                    : FINGER_REST_WARMTH_OUT_MS
                }ms ease-in-out`,
          }}
        />
        {/* Cue and its why/how share one fade: everything to read dissolves the
            moment stillness begins. */}
        <div
          class="finger-rest-cue"
          style={{
            opacity: getIsResting() ? 0 : 1,
            transition: prefersReducedMotion()
              ? "none"
              : `opacity ${FINGER_REST_CUE_FADE_MS}ms ease-in-out`,
          }}
        >
          <div class="txtBig">Let your finger rest here.</div>
          <div class="finger-rest-why">
            The finger that keeps scrolling, still for a moment. Press and stay.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerRestInteraction;

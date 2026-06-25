import {
  Component,
  createEffect,
  createSignal,
  Index,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  DRAG_THRESHOLD_PX,
  VELOCITY_SAMPLE_SIZE,
  LONG_PRESS_DURATION_MS,
  HAPTIC_PROGRESS_POINTS,
  FLING_ANIMATION_CONFIG,
  COMPLETION_ANIMATION_CONFIG,
  calculateVelocity,
  updatePhysics,
  calculateDragEffects,
  easeInOut,
  easeOutBack,
  triggerHaptic,
  triggerHapticPattern,
  applyRubberBanding,
  getSunSize,
  hasVerticalCompletionIntent,
  getSunReleaseAction,
  shouldAcceptSunPointerStart,
  calculateDragColorTemperature,
  type VelocitySample,
  type PhysicsState,
  type SunDragDirection,
} from "./sunAnimationUtils";
import { playCompletionSound } from "./sunAudio";
import {
  breathCycleMs,
  getBreathStateAt,
  BREATH_PAUSE_PATTERN,
  type BreathPattern,
} from "@src/shared/components/interaction/breathTimeline";

type SunPosition = {
  x: number;
  y: number;
};

interface SunProps {
  onSkip: () => void;
  onFlingAway: () => void;
  onDragComplete: () => void;
  onStartBackgroundAnimation?: (direction: "up" | "down") => void;
  onCompletionStarted?: (started: boolean) => void;
  eventRoot?: ShadowRoot;
  /**
   * Opt-in: fired with `Date.now()` at the instant a once-through breath actually
   * begins — i.e. after the glide lands, when `startBreathCycle` captures its
   * origin. A cue (the strong-friction breath pause) can share this exact
   * timestamp so its copy and the disc breathe on one clock (GitHub #27). NOT
   * fired for a looping breath (the surf pulse), whose cue is fraction-based and
   * never reads the breath model.
   */
  onBreathStart?: (startedAt: number) => void;
  /**
   * Opt-in for a permanently-mounted sun (the shell sun): keep box-shadow out of
   * `will-change` so the browser doesn't hold a compositor-layer hint alive for
   * the app's lifetime (box-shadow can't be GPU-composited anyway). The old
   * CompanionSun did exactly this.
   */
  minimizeWillChange?: boolean;
  tapThreshold?: number;
  isTapEnabled?: boolean;
  isDragEnabled?: boolean;
  /**
   * Companion-rest hover. The resting disc is pointer-transparent, so the
   * bottom-bar tap target relays its hover here to lift + glow the sun, matching
   * the bottom-bar buttons' hover affordance.
   */
  isHovered?: boolean;
  variant?: "sun" | "moon";
  completionDirection?: "any" | "down";
  /**
   * Post-interaction resting state. When set, the sun glides to a viewport
   * anchor and holds there (optionally breathing) instead of being hidden —
   * the same element transforms across the breath pause and the intent/time
   * choices, so it is never swapped out. null returns it to its interactive
   * position.
   */
  settle?: SunSettle | null;
  /**
   * Faint progress dots arranged as a crown above the disc (`filled` of `total`
   * lit). Used by the daily-questions flow as a gentle, non-numeric "where am I"
   * hint while this one sun carries the user through the questions. Omitted /
   * null everywhere else, so the crown never shows outside that flow.
   */
  orbit?: { total: number; filled: number } | null;
}

export interface SunSettle {
  /** Vertical resting point as a fraction of viewport height (0 = top). */
  anchorYRatio?: number;
  /**
   * Fixed horizontal resting point in px from the left edge (x is centered when
   * omitted). Use to land on a fixed-px element (the Little Sun corner) so the
   * two don't drift apart on wide viewports.
   */
  anchorXPx?: number;
  /**
   * Horizontal resting point as a fraction of viewport width (0 = left edge).
   * Overrides anchorXPx's default centring when set. Used to land on a
   * measured fractional point (the Android Little Sun's dragged position) that
   * tracks the viewport rather than a fixed px corner.
   */
  anchorXRatio?: number;
  /**
   * Fixed vertical resting point in px from the bottom edge. Overrides
   * anchorYRatio when set. Used to land on the bottom-bar companion anchor
   * (--companion-bar-center-y) without drifting on tall viewports.
   */
  anchorYPxFromBottom?: number;
  /**
   * Fixed vertical resting point in px from the top edge. Overrides anchorYRatio
   * (but not anchorYPxFromBottom). Provided as the mirror of anchorYPxFromBottom
   * for any future top-anchored settle.
   */
  anchorYPxFromTop?: number;
  /** Resting scale relative to the sun's base size. */
  scale?: number;
  /**
   * Target disc diameter in CSS px. When set it overrides `scale`: the disc
   * settles to exactly this many px (scale = discPx / base size), so the morph
   * lands at the Little Sun's real size on any viewport instead of a fixed
   * fraction of a base that varies with screen width. Used by the departing
   * hand-off.
   */
  discPx?: number;
  /**
   * Halo colour as an `"r, g, b"` string for the settled disc's box-shadow,
   * overriding the default white (sun) glow. The departing sun warms to the
   * Little Sun's amber here so the glow colour matches at hand-off. Ignored for
   * the moon, which keeps its own cool halo.
   */
  glowColor?: string;
  /**
   * Halo intensity for the settled disc, overriding the bold companion rest
   * glow. The departing hand-off dials it down to the Little Sun's tighter halo.
   */
  glowIntensity?: number;
  /** Run one slow inhale→hold→exhale while settled. */
  breathe?: boolean;
  /** Loop the breath continuously (a gentle meditation pulse) instead of once. */
  breathLoop?: boolean;
  /** Override the peak swell of the breath (default BREATH_PEAK_BONUS); smaller = gentler. */
  breathPeakBonus?: number;
  /** Shape and duration of the breath; defaults to the intervention-pause pattern. */
  breathPattern?: BreathPattern;
}

export const Sun: Component<SunProps> = (props) => {
  let sunEl: HTMLDivElement;
  const [getDragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  // The offset the disc rests at when not being dragged. {0,0} (the base) for the
  // plain interactive sun, but the shell sun's interactive rest is the measured
  // placeholder anchor — drags add to this and a release snaps back to it, so the
  // disc is draggable from wherever it actually rests.
  const [getRestOffset, setRestOffset] = createSignal({ x: 0, y: 0 });
  const [getOpacity, setOpacity] = createSignal(1);
  const [getScale, setScale] = createSignal(1);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getIsPointerOver, setIsPointerOver] = createSignal(false);
  const [getIsAnimating, setIsAnimating] = createSignal(false);
  // True only while a role-transition glide (enter/exitSettle) is carrying the
  // disc to a new rest. This is a strict subset of getIsAnimating, which is also
  // true during the breath loop, snap-back and fling — all of which stay
  // grabbable (handleStart takes them over cleanly). A settle glide must NOT be
  // grabbable mid-flight: taking it over cancels the glide and re-anchors the
  // rest to the interrupted spot, stranding the disc there. That's the "tap the
  // rising sun a second time and it sticks, full-size" bug — the companion→
  // interactive glide gets cancelled half-way and never lands. So while this is
  // true the disc ignores pointer input and just finishes gliding into place.
  const [getIsSettlingIntoRole, setIsSettlingIntoRole] = createSignal(false);
  const [getTapCount, setTapCount] = createSignal(0);
  const [getDragProgress, setDragProgress] = createSignal(0);
  // Write-only: the setters feed the drag bookkeeping below, but nothing reads
  // these back (the glow no longer gates on them), so the getters are omitted.
  const [, setDragDirection] = createSignal<"up" | "down" | "none">("none");
  const [, setIsBeyondThreshold] = createSignal(false);
  const [getIsCompletionStarted, setIsCompletionStarted] = createSignal(false);
  const [getRotation, setRotation] = createSignal(0);
  const [getGlowIntensity, setGlowIntensity] = createSignal(0);
  const [getColorTemp, setColorTemp] = createSignal(0); // -1 = cool (up), 0 = neutral (down/none)
  const isTapEnabled = () => props.isTapEnabled ?? true;
  const isDragEnabled = () => props.isDragEnabled ?? true;
  const dispatchInteractionEvent = (name: string, detail: unknown) => {
    const event = new CustomEvent(name, { detail });
    (props.eventRoot ?? window).dispatchEvent(event);
  };

  let tapTimer: number | null = null;
  let startPos = { x: 0, y: 0 };
  let animationFrame: number;
  let velocitySamples: VelocitySample[] = [];
  let longPressTimer: number | null = null;
  let settleFrame: number | undefined;

  // Store event handler references for cleanup
  let touchStartHandler: EventListener | null = null;
  let touchMoveHandler: EventListener | null = null;
  let touchEndHandler: EventListener | null = null;
  let mouseDownHandler: EventListener | null = null;

  onMount(() => {
    // Pre-initialize transform to eliminate initial jaggedness
    // This forces the browser to create the transform matrix early
    if (sunEl) {
      sunEl.style.transform = "translate(0px, 0px) scale(1)";
      // Ensure we include box-shadow to avoid jank — except for a permanently
      // mounted sun, where holding a box-shadow layer hint alive isn't worth it.
      sunEl.style.willChange = props.minimizeWillChange
        ? "transform"
        : "transform, box-shadow";
      // Force a reflow to ensure the transform is applied
      sunEl.offsetHeight;

      // If we mount already in a settled role (the shell companion rests in the
      // top bar from the first paint), snap straight to it — no glide. The
      // settle effect is deferred, so it only animates later role changes.
      // Suppress the CSS transform-transition for this frame; otherwise the
      // jump from the base (centre) to the anchor would glide in over 160ms on
      // load. Restore the transition next frame so later moves still ease.
      if (props.settle) {
        const target = getAnchorOffset(props.settle);
        setIsAnimating(true);
        setDragOffset(target);
        setRestOffset(target);
        setScale(restScaleForSettle(props.settle));
        requestAnimationFrame(() => setIsAnimating(false));
      }
    }

    setupDragHandlers();
  });

  onCleanup(() => {
    cancelCompletionFrame();
    cancelSettleFrame();
    if (tapTimer) {
      clearTimeout(tapTimer);
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }

    // Clean up event listeners
    if (sunEl) {
      if (touchStartHandler) {
        sunEl.removeEventListener("touchstart", touchStartHandler);
      }
      if (touchMoveHandler) {
        sunEl.removeEventListener("touchmove", touchMoveHandler);
      }
      if (touchEndHandler) {
        sunEl.removeEventListener("touchend", touchEndHandler);
      }
      if (mouseDownHandler) {
        sunEl.removeEventListener("mousedown", mouseDownHandler);
      }
    }
  });

  const getSunCenterForOffset = (
    offset = getDragOffset(),
  ): SunPosition | undefined => {
    if (!sunEl) return undefined;

    const rect = sunEl.getBoundingClientRect();
    const currentOffset = getDragOffset();

    return {
      x: rect.left + rect.width / 2 - currentOffset.x + offset.x,
      y: rect.top + rect.height / 2 - currentOffset.y + offset.y,
    };
  };

  // --- Post-interaction settle: the sun stays on screen and transforms across
  // the breath pause and the intent/time choices instead of being hidden and
  // replaced by a separate sun. ---
  const GLIDE_DURATION_MS = 650;
  const EXIT_GLIDE_MS = 500;
  // Glides to/from the dashboard companion (the bottom-bar rest rising into the
  // interaction, and the return home) get a gentler, slower duration than other
  // transitions (e.g. cancelling the intent/time choices), which keep the
  // snappier default.
  const COMPANION_GLIDE_MS = 900;
  // Returning home *after a fling* doesn't glide — the disc is off-screen, so a
  // glide would streak it across the whole screen. It fades in at the rest over
  // this instead (see settleInAtRest).
  const COMPANION_FADE_IN_MS = 500;
  // The companion is the only settle anchored by a fixed bottom px with no fixed
  // x (see sunSettle.ts: ratio-based breathing/resting, corner-anchored
  // departing, top-px interactive). Used to give its glides the slower duration.
  const isCompanionSettle = (settle?: SunSettle | null): boolean =>
    settle?.anchorYPxFromBottom != null && settle.anchorXPx == null;
  const BREATH_PEAK_BONUS = 0.22; // inhale grows the rest scale by this much
  const DEFAULT_ANCHOR_Y_RATIO = 0.4;
  const DEFAULT_REST_SCALE = 0.82;

  // Base disc size for this screen (px + baseScale); fixed for the component's
  // life. Used both to render the disc and to convert a settle's pinned disc
  // diameter (discPx) into a scale.
  const sunSize = getSunSize(window.innerWidth);
  // A settle may pin an exact disc diameter (discPx) instead of a scale — the
  // departing hand-off does, so the disc lands at the Little Sun's real px size
  // on any viewport. Convert that to a scale of the base disc; otherwise use the
  // settle's explicit scale (or the default).
  const restScaleForSettle = (settle: SunSettle): number =>
    settle.discPx != null
      ? settle.discPx / sunSize.size
      : (settle.scale ?? DEFAULT_REST_SCALE);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cancelSettleFrame = () => {
    if (settleFrame) {
      cancelAnimationFrame(settleFrame);
      settleFrame = undefined;
    }
  };

  // Stop an in-flight terminal animation (fling / drag-complete / snap-back),
  // which drive the disc on `animationFrame`. The fling in particular runs for a
  // full 3s (FLING_ANIMATION_CONFIG.duration), so it's almost always still going
  // when a dashboard offer it opened is dismissed — its per-frame writes would
  // otherwise keep shoving the disc off-screen on top of the return-home fade.
  const cancelCompletionFrame = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  // Offset that places the sun's center on a resting anchor. The anchor is a
  // fraction of viewport width/height (x defaults to centered), unless a fixed
  // px anchor is given — px wins so the sun can land exactly on a fixed-px
  // element (the Little Sun corner) without drifting on wide viewports.
  const getAnchorOffset = (settle: SunSettle): SunPosition => {
    const rest = getSunCenterForOffset({ x: 0, y: 0 });
    if (!rest) return getDragOffset();
    const anchorX =
      settle.anchorXRatio != null
        ? window.innerWidth * settle.anchorXRatio
        : (settle.anchorXPx ?? window.innerWidth * 0.5);
    const anchorY =
      settle.anchorYPxFromBottom != null
        ? window.innerHeight - settle.anchorYPxFromBottom
        : settle.anchorYPxFromTop != null
          ? settle.anchorYPxFromTop
          : window.innerHeight *
            (settle.anchorYRatio ?? DEFAULT_ANCHOR_Y_RATIO);
    return { x: anchorX - rest.x, y: anchorY - rest.y };
  };

  // Ease the offset and scale toward a target. The disc's glow is its own
  // box-shadow, so it rides the disc transform and nothing needs the per-frame center.
  const animateOffsetScaleTo = (
    targetOffset: SunPosition,
    targetScale: number,
    duration: number,
    onDone?: () => void,
  ) => {
    setIsAnimating(true); // suppress the CSS transform-transition while JS drives it
    const startOffset = getDragOffset();
    const startScale = getScale();
    const startTime = Date.now();

    const step = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const eased = easeInOut(progress);
      const offset = {
        x: startOffset.x + (targetOffset.x - startOffset.x) * eased,
        y: startOffset.y + (targetOffset.y - startOffset.y) * eased,
      };
      setDragOffset(offset);
      setScale(startScale + (targetScale - startScale) * eased);

      if (progress < 1) {
        settleFrame = requestAnimationFrame(step);
      } else {
        settleFrame = undefined;
        onDone?.();
      }
    };

    cancelSettleFrame();
    settleFrame = requestAnimationFrame(step);
  };

  // One slow inhale → hold → exhale over the pause, driven by the shared breath
  // model so the disc's scale and the cue copy ("Breathe in / Hold / Breathe
  // out") move through the same phases on the same beats. Loops as a gentle
  // meditation pulse when opts.loop is set; opts.peakBonus tunes the swell.
  const startBreathCycle = (
    restScale: number,
    pattern: BreathPattern,
    opts?: { loop?: boolean; peakBonus?: number },
  ) => {
    const durationMs = breathCycleMs(pattern);
    const peak = restScale + (opts?.peakBonus ?? BREATH_PEAK_BONUS);
    let startTime = Date.now();
    // Publish the breath's origin so a cue can share this exact clock (GitHub
    // #27). Only the once-through breath (the pause) does this; the looping surf
    // pulse re-captures startTime each cycle and has no phase-aligned cue to sync.
    if (!opts?.loop) props.onBreathStart?.(startTime);

    const step = () => {
      const elapsed = Date.now() - startTime;
      const { fill } = getBreathStateAt(elapsed, pattern);
      setScale(restScale + (peak - restScale) * fill);

      if (elapsed < durationMs) {
        settleFrame = requestAnimationFrame(step);
      } else if (opts?.loop) {
        // Gentle meditation pulse: start the next inhale→exhale immediately. The
        // loop is cancelled when the next settle (e.g. back to interactive) runs.
        startTime = Date.now();
        settleFrame = requestAnimationFrame(step);
      } else {
        settleFrame = undefined;
        setScale(restScale);
        setIsAnimating(false);
      }
    };

    cancelSettleFrame();
    settleFrame = requestAnimationFrame(step);
  };

  // The shell sun is permanently mounted and reused for every interaction, so a
  // finished gesture's terminal state (set in handleEnd/long-press and never
  // otherwise cleared) would otherwise persist into the next one: the disc stays
  // "completion started" — its drag/tap handlers early-return, so it's frozen and
  // can't be dragged down to ground again — and the completion animation leaves it
  // faded/rotated. Clear all of that when it glides back to its idle companion
  // home, the single point every interaction returns through, so the next one
  // starts from a clean, fully interactive disc. Self-owned suns (interventions)
  // unmount instead of returning home, so they never hit this and are unaffected.
  const resetTerminalStateForReuse = () => {
    setIsCompletionStarted(false);
    setOpacity(1);
    setRotation(0);
    setGlowIntensity(0);
    setColorTemp(0);
    setIsBeyondThreshold(false);
    setDragProgress(0);
    setDragDirection("none");
    // Drop any in-flight tap streak (and its pending 1.5s reset) so a partial
    // tap count from the just-ended interaction can't linger as indicator dots
    // on the idle companion or bleed into the next interaction's tap-to-continue.
    if (tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
    }
    setTapCount(0);
  };

  // Bring a disc that was flung off-screen home *without* streaking it across the
  // whole screen: place it straight on its rest and gently fade (with a touch of
  // scale) it in there. Used when a disc a terminal gesture flung off-screen
  // returns to the bottom bar — e.g. the let-go offer (flung all the way up, then
  // declined): a glide from that off-screen position would zip back unpleasantly
  // fast. (A still-on-screen disc glides instead — see enterSettle.)
  const settleInAtRest = (
    target: SunPosition,
    restScale: number,
    onDone?: () => void,
  ) => {
    cancelSettleFrame();
    // The fling that flung this disc off-screen may still be animating (it runs
    // 3s); kill it so it can't fight the fade-in below and drag the disc back out.
    cancelCompletionFrame();
    setIsAnimating(true);
    setDragOffset(target); // snap home — no cross-screen glide
    const startScale = restScale * 0.6;
    setScale(startScale);
    setOpacity(0);
    const startTime = Date.now();
    const step = () => {
      const eased = easeInOut(
        Math.min((Date.now() - startTime) / COMPANION_FADE_IN_MS, 1),
      );
      setOpacity(eased);
      setScale(startScale + (restScale - startScale) * eased);
      if (eased < 1) {
        settleFrame = requestAnimationFrame(step);
      } else {
        settleFrame = undefined;
        onDone?.();
      }
    };
    settleFrame = requestAnimationFrame(step);
  };

  // Whether the disc's centre is still within the viewport right now. A terminal
  // gesture that *flung* the disc away (let-go up) leaves it off-screen; a
  // down-drag whose completion has only just begun (the grounding offer, which
  // hands straight to the companion settle) leaves it still on-screen near its
  // release point. The two want different homecomings — see enterSettle.
  const isDiscCenterOnScreen = (): boolean => {
    const c = getSunCenterForOffset();
    if (!c) return false;
    return (
      c.x >= 0 &&
      c.x <= window.innerWidth &&
      c.y >= 0 &&
      c.y <= window.innerHeight
    );
  };

  const enterSettle = (settle: SunSettle, fromSettle?: SunSettle | null) => {
    setIsDragging(false);
    // The disc is now gliding to a new rest — go inert until it lands (see
    // getIsSettlingIntoRole) so a tap can't strand it mid-glide.
    setIsSettlingIntoRole(true);
    // A terminal gesture can leave the disc flung off-screen (the let-go fling
    // runs a full 3s). Only then must the return home fade in at the rest rather
    // than glide — a glide from off-screen would streak across the whole screen.
    // When the disc is still on-screen (the down-drag-to-ground hands to the
    // companion settle the instant its completion starts, before it has moved),
    // a glide to the bottom is the cleaner morph and avoids a hard cut. Capture
    // this BEFORE resetTerminalStateForReuse clears the completion flag.
    const wasFlungOffScreen =
      isCompanionSettle(settle) &&
      getIsCompletionStarted() &&
      !isDiscCenterOnScreen();
    if (isCompanionSettle(settle)) resetTerminalStateForReuse();
    const restScale = restScaleForSettle(settle);
    const target = getAnchorOffset(settle);
    // This anchor is now the disc's rest, so a drag release snaps back here
    // (the interactive shell sun rests on its placeholder, not the base).
    setRestOffset(target);
    // The rise out of the companion (dashboard → intervention) glides slower.
    const duration = isCompanionSettle(fromSettle)
      ? COMPANION_GLIDE_MS
      : GLIDE_DURATION_MS;

    const onSettled = () => {
      // The glide has landed; the disc is grabbable again (the breath loop that
      // may start below is take-over-safe, unlike the glide).
      setIsSettlingIntoRole(false);
      if (settle.breathe) {
        startBreathCycle(
          restScale,
          settle.breathPattern ?? BREATH_PAUSE_PATTERN,
          {
            loop: settle.breathLoop,
            peakBonus: settle.breathPeakBonus,
          },
        );
      } else {
        setIsAnimating(false);
      }
    };

    if (prefersReducedMotion()) {
      cancelSettleFrame();
      // Also stop any in-flight fling (it ignores reduced motion and runs its
      // full 3s); otherwise it would immediately overwrite the snap-home below.
      cancelCompletionFrame();
      setDragOffset(target);
      setScale(restScale);
      setIsAnimating(false);
      setIsSettlingIntoRole(false); // snapped, not gliding — grabbable at once
      return;
    }

    if (wasFlungOffScreen) {
      settleInAtRest(target, restScale, onSettled);
      return;
    }

    // A terminal completion may still be mid-flight when we glide instead (the
    // down-drag-to-ground that opened a dashboard offer settles to the companion
    // the instant its completion starts): cancel it so its per-frame writes don't
    // fight the glide below and drag the disc off the bottom edge.
    cancelCompletionFrame();
    animateOffsetScaleTo(target, restScale, duration, onSettled);
  };

  const exitSettle = (fromSettle?: SunSettle | null) => {
    cancelSettleFrame();
    // Gliding back to base — inert until it lands (see getIsSettlingIntoRole).
    setIsSettlingIntoRole(true);
    // Returns the disc to its untransformed base (e.g. the plain interactive sun
    // with no placeholder). A return from the companion keeps the slower glide.
    const duration = isCompanionSettle(fromSettle)
      ? COMPANION_GLIDE_MS
      : EXIT_GLIDE_MS;
    // The base becomes the rest again.
    setRestOffset({ x: 0, y: 0 });
    if (prefersReducedMotion()) {
      setDragOffset({ x: 0, y: 0 });
      setScale(1);
      setIsAnimating(false);
      setIsSettlingIntoRole(false);
      return;
    }
    animateOffsetScaleTo({ x: 0, y: 0 }, 1, duration, () => {
      setIsAnimating(false);
      setIsSettlingIntoRole(false);
    });
  };

  // Re-settle when the target changes (phases map to stable settle objects, so
  // identity tracks "did the target change"). `on` keeps the per-frame writes
  // inside enter/exitSettle from re-triggering this; `defer` skips the initial
  // interactive/null state so no spurious glide fires on mount.
  createEffect(
    on(
      () => props.settle ?? null,
      (settle, prevSettle) => {
        if (settle === prevSettle) return;
        if (settle) enterSettle(settle, prevSettle);
        else exitSettle(prevSettle);
      },
      { defer: true },
    ),
  );

  const setupDragHandlers = () => {
    if (!sunEl) return;

    let isDragIntent = false;
    let touchStartTime = 0;
    let lastHapticPointIndex = -1;

    // Track pending rAF work so we only process one frame at a time
    let isRafPending = false;
    let latestClientX = 0;
    let latestClientY = 0;
    let allowFinalFrame = false;

    const handleStart = (clientX: number, clientY: number) => {
      // A new gesture only starts when the disc is settled and not on its way
      // out. A completion animation (fling / drag-complete) or a role-transition
      // glide both make it inert: taking the gesture over (below) mid-glide would
      // cancel the glide and re-anchor the rest to the interrupted spot, leaving
      // the disc stranded mid-transition — e.g. tapping the rising sun a second
      // time froze it full-size. Let the glide land first; the disc becomes
      // grabbable the instant it does. (See shouldAcceptSunPointerStart.)
      if (
        !shouldAcceptSunPointerStart({
          isCompletionStarted: getIsCompletionStarted(),
          isSettlingIntoRole: getIsSettlingIntoRole(),
        })
      )
        return;

      // Grabbing the sun mid-animation (the breath cycle or a snap-back — the
      // role-transition glide is already excluded above) used to leave the
      // animation's rAF loop running alongside the drag's — both write
      // dragOffset/scale/opacity every frame and fight each other. Worse, the
      // drag anchors its delta to getRestOffset(), which the animation may have
      // already advanced to its final anchor while the disc is still mid-flight,
      // so the first drag frame teleports the sun and the two loops can shove it
      // off-screen or shrink/fade it to nothing. Take over cleanly: stop any
      // running animation and re-anchor the rest to wherever the disc actually
      // sits right now so the drag (and its snap-back) starts from what's on screen.
      if (getIsAnimating()) {
        cancelSettleFrame();
        cancelCompletionFrame();
        setRestOffset(getDragOffset());
        setIsAnimating(false);
      }

      touchStartTime = Date.now();
      isDragIntent = false;
      startPos = { x: clientX, y: clientY };
      // Initialize last-known position so release without movement doesn't create a fake drag
      latestClientX = clientX;
      latestClientY = clientY;
      // Reset velocity tracking
      velocitySamples = [
        {
          x: clientX,
          y: clientY,
          timestamp: Date.now(),
        },
      ];
      // Immediately set dragging state to disable transitions
      setIsDragging(true);
      // Reset haptic threshold tracking
      lastHapticPointIndex = -1;
      // Start long press timer
      if (isDragEnabled()) {
        startLongPressTimer();
      }
    };

    const applyDragFrame = () => {
      // Abort if drag has ended unless we're flushing a final frame on release
      if (!getIsDragging() && !allowFinalFrame) {
        return;
      }

      const rawDeltaX = latestClientX - startPos.x;
      const rawDeltaY = latestClientY - startPos.y;

      const moveDistance = Math.sqrt(
        rawDeltaX * rawDeltaX + rawDeltaY * rawDeltaY,
      );

      // Cancel long press if moved beyond tolerance (10px allows for finger jitter)
      if (moveDistance > 10) {
        cancelLongPressTimer();
      }

      if (moveDistance > 10 && !isDragIntent) {
        isDragIntent = true;
      }

      // Apply rubber-banding for weighted feel
      const deltaX = applyRubberBanding(rawDeltaX);
      const deltaY = applyRubberBanding(rawDeltaY);
      const hasVerticalDragIntent = hasVerticalCompletionIntent({
        x: rawDeltaX,
        y: rawDeltaY,
      });
      const dragDirection: SunDragDirection = hasVerticalDragIntent
        ? deltaY > 0
          ? "down"
          : deltaY < 0
            ? "up"
            : "none"
        : "none";

      // Calculate drag progress and visual effects (use raw values for threshold logic).
      // Horizontal-dominant drags still move the sun, but they do not arm completion.
      const dragDistance = hasVerticalDragIntent ? Math.abs(rawDeltaY) : 0;
      const effects = calculateDragEffects(rawDeltaY, dragDistance);

      // Progressive glow: quadratic ramp from 0-100% of threshold
      const glowProgress = Math.min(dragDistance / DRAG_THRESHOLD_PX, 1);
      setGlowIntensity(glowProgress * glowProgress);

      // Progressive haptics at 33%, 66%, 100% of threshold
      const progressNormalized = dragDistance / DRAG_THRESHOLD_PX;
      const currentPointIndex = HAPTIC_PROGRESS_POINTS.findIndex(
        (point) => progressNormalized < point,
      );
      const effectiveIndex =
        currentPointIndex === -1
          ? HAPTIC_PROGRESS_POINTS.length - 1
          : currentPointIndex - 1;

      if (effectiveIndex > lastHapticPointIndex) {
        // Crossed a new threshold going up
        triggerHaptic(
          effectiveIndex === HAPTIC_PROGRESS_POINTS.length - 1
            ? "medium"
            : "light",
        );
        lastHapticPointIndex = effectiveIndex;
        if (dragDistance >= DRAG_THRESHOLD_PX) {
          setIsBeyondThreshold(true);
        }
      } else if (effectiveIndex < lastHapticPointIndex) {
        // Crossed back down
        lastHapticPointIndex = effectiveIndex;
        if (dragDistance < DRAG_THRESHOLD_PX) {
          setIsBeyondThreshold(false);
        }
      }

      // Batch all state updates together. Drags are relative to the disc's rest
      // (the placeholder anchor for the shell sun, else the base), so the disc
      // moves from where it actually sits rather than snapping to the base first.
      const rest = getRestOffset();
      setDragOffset({ x: rest.x + deltaX, y: rest.y + deltaY });
      setScale(effects.scale);
      setOpacity(effects.opacity);

      // Update progress and direction for visual indicators
      setDragProgress(effects.progress);
      setDragDirection(dragDirection);

      setColorTemp(calculateDragColorTemperature(dragDirection, dragDistance));

      // Track velocity samples
      const now = Date.now();
      velocitySamples.push({
        x: latestClientX,
        y: latestClientY,
        timestamp: now,
      });
      if (velocitySamples.length > VELOCITY_SAMPLE_SIZE) {
        velocitySamples.shift();
      }

      // Only emit drag progress events after drag intent is confirmed
      if (isDragIntent) {
        const intensity = getDragProgress();
        dispatchInteractionEvent("dragProgress", {
          direction: dragDirection,
          intensity,
          isDragging: true,
        });
      }

      // Reset final-frame allowance so we don't keep processing after release
      allowFinalFrame = false;
    };

    const handleMove = (clientX: number, clientY: number) => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;

      latestClientX = clientX;
      latestClientY = clientY;

      if (isRafPending) return;

      isRafPending = true;
      requestAnimationFrame(() => {
        isRafPending = false;
        applyDragFrame();
      });
    };

    const handleEnd = () => {
      // Flush the latest movement even if the release happened before the rAF tick
      allowFinalFrame = true;
      applyDragFrame();
      // Capture isDragIntent before resetting - applyDragFrame may have set it
      const wasDragIntent = isDragIntent;
      isDragIntent = false;
      const duration = Date.now() - touchStartTime;
      const offset = getDragOffset();
      // Movement relative to the rest, so tap detection and release thresholds
      // measure the actual drag — not the (possibly large) placeholder anchor the
      // shell sun rests at.
      const rest = getRestOffset();
      const dragDelta = { x: offset.x - rest.x, y: offset.y - rest.y };
      const velocity = calculateVelocity(velocitySamples);

      // Cancel long press timer
      cancelLongPressTimer();

      // Always reset dragging state
      setIsDragging(false);
      setDragProgress(0);
      setDragDirection("none");
      // Don't reset beyond threshold here - let it persist during completion animation

      // Don't reset rotation here - let it animate back smoothly

      // Check for tap: no drag intent, short duration, minimal movement
      if (
        !wasDragIntent &&
        duration < 300 &&
        Math.abs(dragDelta.x) < 10 &&
        Math.abs(dragDelta.y) < 10
      ) {
        handleTap();
        return;
      }

      dispatchInteractionEvent("dragProgress", {
        direction: "none",
        intensity: 0,
        isDragging: false,
      });

      const releaseAction = getSunReleaseAction({
        offset: dragDelta,
        velocity,
        isDragEnabled: isDragEnabled(),
        completionDirection: props.completionDirection,
      });

      if (releaseAction.type === "snapBack") {
        dispatchInteractionEvent("dragProgress", {
          direction: "none",
          intensity: 0,
          isDragging: false,
          resetToInitial: true,
        });
        animateSnapBack();
      } else if (releaseAction.type === "fling") {
        // Vertical fling behavior triggers onFlingAway.
        triggerHaptic("medium");
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.(releaseAction.direction);
        animateFling(velocity);
      } else if (releaseAction.type === "dragComplete") {
        // Slow drag behavior (non-fling) - triggers onDragComplete
        triggerHapticPattern("completion"); // Satisfying heavy + light pattern
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.(releaseAction.direction);
        animateToCompletion(releaseAction.direction);
      }
    };

    const handleTap = () => {
      // Prevent interactions once completion animation has started
      if (getIsCompletionStarted()) return;
      if (!isTapEnabled()) return;

      const currentTapCount = getTapCount() + 1;
      setTapCount(currentTapCount);

      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }

      const threshold = props.tapThreshold || 5;

      if (currentTapCount >= threshold) {
        props.onSkip();
        setTapCount(0);
      } else {
        tapTimer = window.setTimeout(() => {
          setTapCount(0);
        }, 1500);
      }
    };

    const startLongPressTimer = () => {
      cancelLongPressTimer();
      longPressTimer = window.setTimeout(() => {
        if (getIsCompletionStarted()) return;

        // Long press triggered - lock in and play completion
        triggerHapticPattern("completion"); // Satisfying heavy + light pattern
        playCompletionSound();
        setIsCompletionStarted(true);
        props.onCompletionStarted?.(true);
        props.onStartBackgroundAnimation?.("down");
        // Note: animateToCompletion sets isAnimating=true before we clear isDragging
        // to prevent transition glitch
        animateToCompletion("down");
        setIsDragging(false);
      }, LONG_PRESS_DURATION_MS);
    };

    const cancelLongPressTimer = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const animateSnapBack = () => {
      // Keep transitions disabled while JS drives the snap-back animation
      setIsAnimating(true);
      setIsBeyondThreshold(false); // Reset glow when snapping back
      setGlowIntensity(0); // Reset progressive glow
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();
      const startRotation = getRotation();
      const startGlow = getGlowIntensity();
      const startColorTemp = getColorTemp();

      const duration = 600;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutBack(progress); // Subtle overshoot bounce

        // Ease back to the rest offset (the placeholder anchor for the shell sun,
        // else the base), not a hard {0,0}.
        const rest = getRestOffset();
        const currentX =
          rest.x + (startOffset.x - rest.x) * (1 - easedProgress);
        const currentY =
          rest.y + (startOffset.y - rest.y) * (1 - easedProgress);
        const currentOffset = { x: currentX, y: currentY };
        setDragOffset(currentOffset);

        const currentScale = startScale + (1 - startScale) * easedProgress;
        setScale(currentScale);

        const currentOpacity =
          startOpacity + (1 - startOpacity) * easedProgress;
        setOpacity(currentOpacity);

        const currentRotation = startRotation * (1 - easedProgress);
        setRotation(currentRotation);

        // Fade out visual effects during snap-back
        setGlowIntensity(startGlow * (1 - progress));
        setColorTemp(startColorTemp * (1 - progress));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setGlowIntensity(0);
        }
      };

      animate();
    };

    const animateToCompletion = (direction: "up" | "down") => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();

      const config = COMPLETION_ANIMATION_CONFIG;
      const easing =
        direction === "down" ? config.easing.downward : config.easing.upward;
      const targetY =
        direction === "down" ? window.innerHeight : -window.innerHeight;

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / config.duration, 1);
        const easedProgress = easeInOut(progress);

        const currentY =
          startOffset.y + (targetY - startOffset.y) * easedProgress;
        const currentOffset = { x: startOffset.x, y: currentY };
        setDragOffset(currentOffset);

        const currentScale =
          startScale + (easing.targetScale - startScale) * easedProgress;
        setScale(currentScale);

        const currentOpacity =
          startOpacity + (easing.targetOpacity - startOpacity) * easedProgress;
        setOpacity(currentOpacity);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          props.onDragComplete();
        }
      };

      animate();
    };

    const animateFling = (velocity: {
      x: number;
      y: number;
      magnitude: number;
    }) => {
      setIsAnimating(true);
      const startOffset = getDragOffset();
      const startScale = getScale();
      const startOpacity = getOpacity();

      // Safety check: ensure we have valid initial values
      if (!startOffset || startScale <= 0 || startOpacity <= 0) {
        props.onFlingAway();
        return;
      }

      const config = FLING_ANIMATION_CONFIG;
      const screenDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Initialize physics state
      let physicsState: PhysicsState = {
        position: { x: startOffset.x, y: startOffset.y },
        velocity: { x: velocity.x, y: velocity.y },
        rotation: 0,
        scale: startScale,
        opacity: startOpacity,
      };

      const startTime = Date.now();
      let lastTime = startTime;

      const animate = () => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000; // Delta time in seconds
        lastTime = now;
        const elapsedTime = now - startTime;

        // Update physics
        physicsState = updatePhysics(
          physicsState,
          config,
          dt,
          startOffset,
          startScale,
          startOpacity,
          screenDimensions,
        );

        // Apply state to UI
        setDragOffset(physicsState.position);
        setScale(physicsState.scale);
        setOpacity(physicsState.opacity);
        setRotation(physicsState.rotation);

        // Animation runs for fixed duration
        const animationComplete = elapsedTime >= config.duration;

        // Complete after fixed duration
        if (animationComplete) {
          setIsAnimating(false);
          props.onFlingAway();
        } else {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animate();
    };

    // Store handlers for cleanup
    touchStartHandler = ((e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }) as EventListener;

    touchMoveHandler = ((e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }) as EventListener;

    touchEndHandler = ((e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleEnd();
    }) as EventListener;

    mouseDownHandler = ((e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const handleMouseUp = () => {
        handleEnd();
        eventTarget.removeEventListener(
          "mousemove",
          handleMouseMove as EventListener,
        );
        eventTarget.removeEventListener(
          "mouseup",
          handleMouseUp as EventListener,
        );
      };

      // Use shadow root if available, otherwise fall back to document
      const eventTarget: EventTarget = props.eventRoot || document;
      eventTarget.addEventListener(
        "mousemove",
        handleMouseMove as EventListener,
      );
      eventTarget.addEventListener("mouseup", handleMouseUp as EventListener);
    }) as EventListener;

    sunEl.addEventListener("touchstart", touchStartHandler);
    sunEl.addEventListener("touchmove", touchMoveHandler);
    sunEl.addEventListener("touchend", touchEndHandler);
    sunEl.addEventListener("mousedown", mouseDownHandler);
  };

  // Reactive glow color based on upward drag color temperature
  const getGlowColor = () => {
    const ct = getColorTemp();
    return ct < -0.1 ? "200, 220, 255" : "255, 255, 255";
  };
  // Hover lift + halo for the resting companion, echoing the bottom-bar buttons'
  // hover feedback. The lift is slight; the glow reuses the drag box-shadow (see
  // the inline --glow-intensity), pushed past its 0..1 drag range so the inner
  // layer (15px·i blur @ 0.5·i alpha) reaches ~the app's strong --btn-box-shadow
  // glow (0 0 30px rgba(255,255,255,0.9)) — i.e. as bold as a button's hover.
  const COMPANION_HOVER_SCALE = 1.06;
  const COMPANION_HOVER_GLOW = 1.8;
  // The sun carries that same bold halo at all times — the disc's box-shadow glow
  // at the hover intensity — so the idle sun already looks like the (liked) hover
  // state, and, crucially, the glow never drops out while it's being dragged or
  // tapped (both reset getGlowIntensity toward 0). We floor at this baseline rather
  // than gate on drag: the drag ramp (0..1) is dimmer than the rest glow anyway, so
  // letting it take over would only make the sun fade the moment you touch it.
  const COMPANION_REST_GLOW = COMPANION_HOVER_GLOW;
  // The moon carries a resting glow too, the same way the sun does. Its disc is a
  // textured lunar photo (not the old bright gradient orb), so a faint halo reads as
  // "a rock with a ring" rather than a glowing moon — it needs a genuinely bright
  // bloom to glow like the gradient moon did. Floored a touch above the sun's rest
  // (the photo disc isn't self-luminous like the gradient was) so the white/cool
  // bloom layers (Sun.scss .moon box-shadow) light softly at rest — a gentle moon
  // halo, not the loud first pass; hover lifts it further, echoing the bottom-bar
  // hover. Paired with the disc sheen in Sun.scss, which carries most of the
  // "glowing orb" read, so the halo itself can stay restrained.
  const MOON_REST_GLOW = 1.4;
  const MOON_HOVER_GLOW = 2.0;
  // Keep the progress crown mounted through one soft fade when the flow clears
  // it (the success bloom), so the dots dissolve rather than snapping out — a
  // hard cut reads as a jolt (see the styling rules). We hold the last orbit
  // value for the duration of the fade, then unmount.
  const ORBIT_FADE_MS = 600;
  const [getOrbitLeaving, setOrbitLeaving] = createSignal(false);
  let lastOrbit: { total: number; filled: number } | null = null;
  let orbitLeaveT: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const o = props.orbit;
    if (o && o.total > 0) {
      lastOrbit = o;
      clearTimeout(orbitLeaveT);
      setOrbitLeaving(false);
    } else if (lastOrbit) {
      clearTimeout(orbitLeaveT);
      setOrbitLeaving(true);
      orbitLeaveT = setTimeout(() => {
        setOrbitLeaving(false);
        lastOrbit = null;
      }, ORBIT_FADE_MS);
    }
  });
  onCleanup(() => clearTimeout(orbitLeaveT));
  // The crown to draw: the live orbit, or the held last value while it fades out.
  const orbitToRender = (): { total: number; filled: number } | null =>
    props.orbit && props.orbit.total > 0
      ? props.orbit
      : getOrbitLeaving()
        ? lastOrbit
        : null;

  const getInteractionScale = () => {
    if (getIsCompletionStarted()) {
      return 1;
    }

    if (getIsDragging()) {
      return 1.06;
    }

    if (props.isHovered) {
      return COMPANION_HOVER_SCALE;
    }

    return getIsPointerOver() ? 1.04 : 1;
  };

  return (
    <div
      ref={sunEl!}
      class="minded-sun"
      classList={{
        dragging: getIsDragging(),
        moon: props.variant === "moon",
      }}
      onMouseEnter={() => setIsPointerOver(true)}
      onMouseLeave={() => setIsPointerOver(false)}
      style={{
        transform: `translate(${getDragOffset().x}px, ${getDragOffset().y}px) scale(${sunSize.baseScale * getScale() * getInteractionScale()}) rotate(${getRotation()}deg)`,
        opacity: getOpacity(),
        // transform/opacity are JS-driven every frame during a drag or settle
        // glide, so a CSS transition there would fight the inline updates — keep
        // them off then. box-shadow is NOT per-frame (it changes on phase/glow
        // shifts), so let it ease whenever the finger isn't on the disc: that way
        // the departing hand-off's white→amber glow warms softly mid-glide rather
        // than snapping (a hard cut would betray the calm premise). Only an active
        // drag, where the glow tracks the finger, needs it instant.
        transition:
          [
            getIsDragging() || getIsAnimating()
              ? null
              : "transform 160ms ease-out, opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            getIsDragging() ? null : "box-shadow 160ms ease-out",
          ]
            .filter(Boolean)
            .join(", ") || "none",
        width: `${sunSize.size}px`,
        height: `${sunSize.size}px`,
        // A settle may warm the halo to the Little Sun's amber and tighten it for
        // the departing hand-off (sun only — the moon keeps its own cool glow).
        "--glow-color":
          props.variant !== "moon" && props.settle?.glowColor
            ? props.settle.glowColor
            : getGlowColor(),
        "--glow-intensity":
          props.variant === "moon"
            ? Math.max(
                getGlowIntensity(),
                props.isHovered ? MOON_HOVER_GLOW : MOON_REST_GLOW,
              )
            : props.settle?.glowIntensity != null
              ? Math.max(getGlowIntensity(), props.settle.glowIntensity)
              : Math.max(getGlowIntensity(), COMPANION_REST_GLOW),
        "--sun-warmth": Math.max(0, getColorTemp()),
      }}
    >
      {isTapEnabled() && (
        <div class="tap-indicator" classList={{ active: getTapCount() > 0 }}>
          {Array.from({ length: props.tapThreshold || 5 }).map((_, i) => (
            <div
              class="tap-dot"
              classList={{ filled: i + 1 <= getTapCount() }}
            />
          ))}
        </div>
      )}
      <Show when={orbitToRender()}>
        {(orbit) => (
          // A faint crown of dots spread across the top arc (avoiding the bottom,
          // where the disc rests on the bar). Children of the disc, so they ride
          // its scale/float and the ring stays just outside the edge at any size.
          <div
            class="sun-orbit"
            classList={{ "is-leaving": getOrbitLeaving() }}
            aria-hidden="true"
          >
            <Index each={Array.from({ length: orbit().total })}>
              {(_, i) => {
                const total = orbit().total;
                // A fixed gap between adjacent dots, centred on straight-up, so the
                // crown stays a tidy shallow arc over the top of the disc for any
                // count. (A fixed *total* span splayed the few dots we ever show —
                // 2 or 3 — out to the sides at ±60°, reading as scattered rather
                // than a crown.) At 26° apart, 3 dots span just ±26° and sit high
                // above the cap.
                const gapDeg = 26;
                const angle = (i - (total - 1) / 2) * gapDeg;
                // +24 is pre-scale local px: the crown rides the disc's transform
                // (companion scale ~0.42), so this lands ~10px of on-screen
                // clearance beyond the disc edge at every breakpoint.
                const radius = sunSize.size / 2 + 24;
                return (
                  <div
                    class="sun-orbit-dot"
                    classList={{ filled: i < orbit().filled }}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`,
                    }}
                  />
                );
              }}
            </Index>
          </div>
        )}
      </Show>
    </div>
  );
};

export default Sun;

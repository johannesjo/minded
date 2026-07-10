import { createEffect, createSignal } from "solid-js";
import { isDarkModeNow } from "@src/shared/addWrapperClasses";
import { SunSettle } from "@src/shared/components/interaction/sun/Sun";
import {
  getIsSunHandoffInFlight,
  getSunRole,
  getSunSettleForCurrentRole,
  isShellSunInteractive,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import { shouldPauseDriveSun } from "./pauseTakeover";

/**
 * The welcome step's tap-to-pause demo, shared by both platforms' onboarding.
 * The flow owns a single disc (its `getBaseSettle` rests); tapping it opens the
 * real InteractionOverlay, and while the pause is up the shared sunStore drives
 * that same disc through the live interaction — exactly like the dashboard
 * shell sun. This owns the takeover state machine (see `shouldPauseDriveSun`)
 * so the riskiest part of the flow lives in ONE place instead of copied per
 * platform; the components differ only in step content and their base rests.
 *
 * Must be called during a component's init scope (it registers `createEffect`s).
 */
export const createOnboardingSunDemo = (opts: {
  /** The flow's current logical step (0 = welcome, where the demo lives). */
  getStep: () => number;
  /** Whether the flow is gliding out to the dashboard. */
  getIsLeaving: () => boolean;
  /** The rests the flow draws when the pause isn't driving the disc. */
  getBaseSettle: () => SunSettle | null;
  /** Advance off the welcome (the fling/drag/"begin" gesture target). */
  advanceFromWelcome: () => void;
}) => {
  const [getIsShowPause, setIsShowPause] = createSignal(false);
  const [getIsPauseClosing, setIsPauseClosing] = createSignal(false);
  const [getHasPauseTakenOver, setHasPauseTakenOver] = createSignal(false);

  // Day/night read once at mount, matching the copy's companionWord().
  const sunVariant: "moon" | "sun" = isDarkModeNow() ? "moon" : "sun";

  // While the demo pause drives the disc, its settle comes from the shared
  // store (the interaction measures its own anchors there); otherwise from the
  // flow's own rests. One disc, two drivers, never both.
  const isPauseDrivingSun = () =>
    shouldPauseDriveSun({
      isPauseShown: getIsShowPause(),
      isPauseClosing: getIsPauseClosing(),
      hasPauseTakenOver: getHasPauseTakenOver(),
      sunRole: getSunRole(),
    });

  const getActiveSunSettle = (): SunSettle | null =>
    isPauseDrivingSun() ? getSunSettleForCurrentRole() : opts.getBaseSettle();

  // Record the interaction's first role flip after the pause opens, so a later
  // mid-pause "companion" role (grounding) keeps reading as the store's
  // instruction rather than as "not started yet" (see shouldPauseDriveSun).
  createEffect(() => {
    if (
      getIsShowPause() &&
      !getIsPauseClosing() &&
      getSunRole() !== "companion"
    ) {
      setHasPauseTakenOver(true);
    }
  });

  // The sun mounts once its first rest is measured and then STAYS mounted:
  // mid-pause the store's settle can legitimately be null for a beat (the
  // draggable base between anchors), and unmounting on that would hard-cut the
  // one disc out of existence.
  const [getHasSunMounted, setHasSunMounted] = createSignal(false);
  createEffect(() => {
    if (getActiveSunSettle()) setHasSunMounted(true);
  });

  // Only the welcome step's disc takes input — everywhere else the sun is a
  // quiet presence (and the closing "ready" disc can never be dismissed).
  const isSunGrabbable = () =>
    opts.getStep() === 0 && !opts.getIsLeaving() && !getIsShowPause();

  // While the pause runs, input follows the shell-sun rules instead (the
  // store's role + hand-off gate) so the demo behaves exactly like the
  // dashboard interaction.
  const isSunInputEnabled = () =>
    isPauseDrivingSun()
      ? isShellSunInteractive(getSunRole(), getIsSunHandoffInFlight())
      : isSunGrabbable();

  // The welcome gesture: advance the moment a fling/drag completes.
  const advanceFromHero = () => {
    if (opts.getStep() === 0 && !opts.getIsLeaving()) opts.advanceFromWelcome();
  };

  // The welcome invitation: a single tap on the held disc opens the REAL pause
  // (the same InteractionOverlay the dashboard companion and the home-screen
  // widget open). The store should already be idle; make sure a stale role from
  // an earlier surface can't make the takeover read as already-in-flight.
  const openPause = () => {
    if (opts.getStep() !== 0 || opts.getIsLeaving() || getIsShowPause()) return;
    setSunRole("companion");
    setIsShowPause(true);
  };

  // The overlay's onHideInteraction: reset the demo and leave the store idle
  // for the next open (and for the dashboard shell sun that eventually takes
  // over).
  // The overlay's onClosingStarted: the flow reclaims its disc the instant the
  // closing fade begins (the isPauseClosing window in shouldPauseDriveSun).
  const onPauseClosing = () => setIsPauseClosing(true);

  const onPauseClosed = () => {
    setIsShowPause(false);
    setIsPauseClosing(false);
    setHasPauseTakenOver(false);
    setSunRole("companion");
  };

  return {
    sunVariant,
    getIsShowPause,
    onPauseClosing,
    isPauseDrivingSun,
    getActiveSunSettle,
    getHasSunMounted,
    isSunGrabbable,
    isSunInputEnabled,
    openPause,
    advanceFromHero,
    onPauseClosed,
  };
};

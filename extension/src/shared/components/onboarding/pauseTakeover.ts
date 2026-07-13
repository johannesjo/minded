/**
 * Who drives a flow-owned disc while that flow's tap-to-pause demo is up: the
 * live interaction (via the shared sunStore roles, exactly like the dashboard
 * shell sun) or the flow's own rests. Used by the Android and iOS onboarding
 * welcomes, whose ONE disc must morph into the real InteractionOverlay and
 * back - never a second sun, never a cut.
 *
 * The demo mounts the real InteractionOverlay, which flips the store role to
 * "interactive" a frame after mount. Three windows matter:
 *
 * - Before that first flip the role still reads "companion" (the store's idle
 *   default) - the disc must stay on the flow's own rest, not dive to the
 *   store's bottom-bar anchor. `hasPauseTakenOver` is false → the flow drives.
 * - Once the interaction has taken the disc, a mid-pause "companion" role is a
 *   real instruction (the grounding offer parks the disc on the bottom-bar
 *   anchor beneath its invitation) - the store keeps driving.
 * - When the overlay's closing fade begins (`isPauseClosing`, via
 *   InteractionOverlay's onClosingStarted) the flow takes the disc back at
 *   once, so it glides home to its own rest *during* the sky fade - one
 *   motion, no companion detour.
 *
 * Pure so the takeover truth table is unit-testable.
 */
export const shouldPauseDriveSun = (s: {
  isPauseShown: boolean;
  isPauseClosing: boolean;
  hasPauseTakenOver: boolean;
  sunRole: string;
}): boolean =>
  s.isPauseShown &&
  !s.isPauseClosing &&
  (s.sunRole !== "companion" || s.hasPauseTakenOver);

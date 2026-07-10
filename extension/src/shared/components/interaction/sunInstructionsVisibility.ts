/**
 * Whether the "fling / drag / tap the sun" instructions overlay should be
 * mounted.
 *
 * The instructions sit centred over the same region as the post-sun choices.
 * While the sun rests, InteractionCommon lifts the interaction wrapper (which
 * contains this overlay) to z-index 1101 — above the choices overlay at 1100;
 * both z-indexes are set as inline styles there, the wrapper's only while the
 * sun is non-interactive. So a still-mounted instructions layer, even faded to
 * opacity 0, stays stacked over the choices: visible during the cross-fade and,
 * in the hand-off frame, briefly stealing taps from the options beneath it.
 * Unmounting it once the post-sun overlay is up (`showPostSunOverlay`) removes
 * that hazard. The fade itself is owned by the call site's inline opacity (driven
 * by `isExitingInteraction`, which flips before the choices mount), so by the
 * time this returns false the overlay is already at opacity 0 — not a hard cut.
 * Cancelling back from the choices re-mounts it and it fades in again, riding the
 * same `interactionOpacity` ramp that restores the question content.
 *
 * The other flags gate the same overlay:
 * - `showSunInstructions`: we are on the post-answer instructions step.
 * - `isCompletionStarted`: the sun's terminal (fling/drag/tap) animation is
 *   running.
 *
 * The dashboard is deliberately NOT excluded: a dashboard-run intervention
 * reaches this step too, with its own copy (the gestures open the let-go /
 * grounding rituals there instead of leaving) — see the render site in
 * InteractionCommon.
 */
export const shouldShowSunInstructionsOverlay = (state: {
  showSunInstructions: boolean;
  isCompletionStarted: boolean;
  showPostSunOverlay: boolean;
}): boolean =>
  state.showSunInstructions &&
  !state.isCompletionStarted &&
  !state.showPostSunOverlay;

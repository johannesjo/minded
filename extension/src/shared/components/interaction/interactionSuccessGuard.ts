/**
 * Whether an incoming interaction-success callback is stale and should be
 * ignored, because the user has already left the question screen.
 *
 * A success can arrive late: an interaction that saves on a timer can fire its
 * callback after the user has already triple-tapped the sun to the choices.
 * Acting on it then would disarm the intent/time buttons without re-arming or
 * advancing them, freezing the choices with every button greyed.
 *
 * Each flag marks a way the question has already been left:
 * - `hasAnswered`: a success was already handled (guards duplicate callbacks).
 * - `showSunInstructions`: we advanced to the "tap the sun" step.
 * - `showPostSunOverlay`: the breath/intent/time choices are showing — this is
 *   the skip-to-choices path, where `hasAnswered` was never set.
 */
export const shouldIgnoreStaleSuccess = (state: {
  hasAnswered: boolean;
  showSunInstructions: boolean;
  showPostSunOverlay: boolean;
}): boolean =>
  state.hasAnswered || state.showSunInstructions || state.showPostSunOverlay;

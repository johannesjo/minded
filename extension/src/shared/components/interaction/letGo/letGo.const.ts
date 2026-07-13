import {
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";

/**
 * The "let go" reflection the dashboard sun offers when it is flung *away* (up,
 * off the screen). Up = let go, down = ground yourself - the gesture direction
 * picks the ritual, mirroring the "Stay a while?" grounding offer. The flung
 * sun *is* the act of letting go; this names what was released.
 */

/** Fade in/out of the let-go overlay itself. Matches the grounding fade. */
export const LET_GO_FADE_MS = 600;

/**
 * The question waits for the flung sun to fly off the top of the screen before
 * it appears - the flight *is* the release, so cutting to the question mid-flight
 * betrays the gesture. But not every release clears the viewport promptly: a
 * gentle fling can stall on-screen and a slow drag-up only clears near the end of
 * its long completion. So the reveal is capped - once this long the question
 * comes up regardless, and the sun (by now high and rising) is soft-faded out
 * rather than snapped, so the hand-off stays soft. A brisk fling clears well
 * before this and reveals the moment it does (see Sun's onFlungOffscreen).
 */
export const LET_GO_REVEAL_MAX_MS = 800;

/**
 * If the offer is left untouched it fades on its own - a gentle offer never
 * nags. Cancelled the moment the user engages the input, so it can't snatch a
 * half-written thought away. Mirrors the grounding offer's auto-dismiss.
 */
export const LET_GO_AUTO_DISMISS_MS = 15000;

/**
 * Rendered through the standard `Question` component, so it looks and behaves
 * like any other intervention question. Standalone (deliberately not added to a
 * category's `questions` array) so it never enters the random dashboard pool -
 * it is reachable only by flinging the sun away.
 *
 * `isDontSaveAnswer`: the answer is deliberately NOT persisted. The flung sun,
 * naming the thing, and the release together *are* the act of letting go -
 * archiving it would contradict the gesture (and the app's no-tally ethos). It
 * also keeps this standalone qid out of the saved-answers list, where it would
 * otherwise render headingless (its qid isn't in the lookup pool). Mirrors the
 * ephemeral "in this session" prompts (e.g. HBH7).
 */
export const LET_GO_QUESTION: QuestionForPrompt = {
  id: QID.LETGO1,
  categoryId: QuestionCategoryId.SelfDiscovery,
  t: "What do you want to let go of",
  prompt: "I want to let go of",
  isDontSaveAnswer: true,
};

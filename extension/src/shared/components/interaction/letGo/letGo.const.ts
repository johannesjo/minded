import {
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";

/**
 * The "let go" reflection the dashboard sun offers when it is flung *away* (up,
 * off the screen). Up = let go, down = ground yourself — the gesture direction
 * picks the ritual, mirroring the "Stay a while?" grounding offer. The flung
 * sun *is* the act of letting go; this names what was released.
 */

/** Fade in/out of the let-go overlay itself. Matches the grounding fade. */
export const LET_GO_FADE_MS = 600;

/**
 * If the offer is left untouched it fades on its own — a gentle offer never
 * nags. Cancelled the moment the user engages the input, so it can't snatch a
 * half-written thought away. Mirrors the grounding offer's auto-dismiss.
 */
export const LET_GO_AUTO_DISMISS_MS = 15000;

/**
 * Rendered through the standard `Question` component, so it looks and behaves
 * like any other intervention question. Standalone (deliberately not added to a
 * category's `questions` array) so it never enters the random dashboard pool —
 * it is reachable only by flinging the sun away.
 *
 * `isDontSaveAnswer`: the answer is deliberately NOT persisted. The flung sun,
 * naming the thing, and the release together *are* the act of letting go —
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

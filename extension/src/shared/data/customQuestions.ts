import { nanoid } from "nanoid";
import { CustomQuestion } from "@src/dataInterface/syncData";
import {
  CUSTOM_QUESTION_ID_PREFIX,
  CustomQuestionId,
} from "@src/shared/data/questionId";
import {
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";

export const createCustomQuestion = (t: string): CustomQuestion => ({
  id: `${CUSTOM_QUESTION_ID_PREFIX}${nanoid()}` as CustomQuestionId,
  t: t.trim(),
  createdTS: Date.now(),
});

/**
 * The user's questions in creation order, for every read the settings list is
 * built from. Storage order is not stable (an undone remove re-appends), so
 * reads sort - the same contract getEditableAlternatives keeps for the
 * alternatives list - or a row would sit in place now and jump to the bottom
 * on the next open.
 */
export const sortCustomQuestions = (
  customQuestions: CustomQuestion[] | undefined,
): CustomQuestion[] =>
  [...(customQuestions ?? [])].sort((a, b) => a.createdTS - b.createdTS);

/**
 * The user's questions as members of the regular question pool, so the
 * intervention and everything downstream (saving, dashboard recaps) treat
 * them exactly like a built-in question - the only difference is where the
 * text comes from.
 */
export const customQuestionsToPrompts = (
  customQuestions: CustomQuestion[] | undefined,
): QuestionForPrompt[] =>
  (customQuestions ?? []).map((customQuestion) => ({
    id: customQuestion.id,
    t: customQuestion.t,
    categoryId: QuestionCategoryId.MyQuestions,
  }));

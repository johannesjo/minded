import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { formatQuestionText } from "@src/util/formatQuestionText";

/** Check if there's a focused input/textarea with modified content */
export const isActivelyEditing = (shadowRoot?: ShadowRoot | null): boolean => {
  const activeEl = shadowRoot?.activeElement ?? document.activeElement;
  if (
    activeEl instanceof HTMLTextAreaElement ||
    activeEl instanceof HTMLInputElement
  ) {
    const value = activeEl.value.trim();
    const placeholder = activeEl.placeholder || "";
    // Has content beyond just whitespace and not just the placeholder
    return value.length > 0 && value !== placeholder;
  }
  return false;
};

export const getInteractionRoot = (shadowRoot?: ShadowRoot) =>
  shadowRoot?.getElementById("minded-6622") ??
  document.getElementById("minded-6622");

export type ForcedWidgetContent =
  | { mode: "NOTICE"; cue: (typeof NOTICE_CUES)[number] }
  | { mode: "ACTION_ADVICE"; advice: (typeof ACTION_ADVICES)[number] }
  | { mode: "QUESTION"; question: QuestionForPrompt };

/**
 * Resolve the widget's displayed line back to the interaction mode + exact
 * content item it came from. `NOTICE`, `ACTION_ADVICE`, and the ambient-safe
 * slice of `QUESTION` are the widget-safe modes, and the widget shows those
 * pools' lines verbatim (questions in their `formatQuestionText` display form,
 * "?" included), so an exact string match recovers the item. Returns undefined
 * for anything unrecognised - other content, a copy drift, or a crafted intent -
 * so the caller falls back to the normal random pick instead of breaking.
 */
export const matchWidgetLine = (
  line: string,
): ForcedWidgetContent | undefined => {
  const cue = NOTICE_CUES.find((c) => c.cue === line);
  if (cue) return { mode: "NOTICE", cue };
  const advice = ACTION_ADVICES.find((a) => a.txt === line);
  if (advice) return { mode: "ACTION_ADVICE", advice };
  const question = QUESTIONS.find((q) => formatQuestionText(q.t) === line);
  if (question) return { mode: "QUESTION", question };
  return undefined;
};

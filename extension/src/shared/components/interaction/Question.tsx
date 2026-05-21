/* @refresh reload */
import { createSignal, JSX } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import {
  IS_ANDROID,
  saveAnswer,
} from "@src/dataInterface/commonSyncDataInterface";
import { nanoid } from "nanoid";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";

export const Question: (props: {
  initialQuestion: QuestionForPrompt;
  answers: Answer[];
  onSuccess: (answer: Answer) => void;
  onSkip: () => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onCancelCountdown: () => void;
  initialValue?: string;
  onValueChange?: (val: string) => void;
  maxLength?: number;
}) => JSX.Element = (props) => {
  const question = props.initialQuestion;
  const initialInputValue = question.prompt
    ? question.prompt + " "
    : (props.initialValue ?? "");
  const [getInpEl, setInpEl] = createSignal<HTMLTextAreaElement | null>(null);
  const [getShowInput, setShowInput] = createSignal(false);

  const formatQuestionText = (txt: string): string => {
    const trimmed = (txt || "").trim();
    if (!trimmed) return "";
    if (trimmed.includes("?")) return trimmed;
    const lastChar = trimmed[trimmed.length - 1];
    if (lastChar === "." || lastChar === "!" || lastChar === "…") {
      return trimmed;
    }
    return trimmed + "?";
  };

  const normalizeAnswerText = (txt: string): string =>
    (txt || "").replace(/\s+/g, " ").trim();

  const submitAnswer = async (answerTxt: string) => {
    const normalizedVal = normalizeAnswerText(answerTxt);
    const normalizedPrompt = question.prompt
      ? normalizeAnswerText(question.prompt)
      : "";
    const remainderWhenPrefilled =
      normalizedPrompt && normalizedVal.startsWith(normalizedPrompt)
        ? normalizedVal.slice(normalizedPrompt.length).trim()
        : normalizedVal;
    const answer = {
      questionCategoryId: question.categoryId,
      qid: question.id,
      val: answerTxt,
      ts: Date.now(),
      id: nanoid(),
    };

    if (!normalizedVal || normalizedVal.length < 2) return;
    if (normalizedPrompt && remainderWhenPrefilled.length < 2) return;
    if (!question.isDontSaveAnswer) {
      await saveAnswer(answer);
    }
    props.onSuccess(answer);
  };

  const revealInput = () => {
    if (getShowInput()) return;
    setShowInput(true);
    props.onCancelCountdown();
    setTimeout(() => getInpEl()?.focus(), 100);
  };

  return (
    <div id="minded-6622-question-wrapper">
      <div
        id="minded-6622-question"
        class="txtBig"
        classList={{ "show-input": getShowInput() }}
        role="button"
        tabindex={getShowInput() ? -1 : 0}
        aria-expanded={getShowInput()}
        onClick={revealInput}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            revealInput();
          }
        }}
      >
        <span>{formatQuestionText(question.t)}</span>
      </div>

      <div
        class="question-input-container"
        classList={{ show: getShowInput() }}
        onMouseEnter={props.onCancelCountdown}
        onClick={props.onCancelCountdown}
      >
        <InputWithSend
          onCancelCountdown={props.onCancelCountdown}
          value={initialInputValue}
          maxLength={props.maxLength ?? 500}
          isAutoFocus={!IS_ANDROID}
          setRef={setInpEl}
          onInput={(val) => props.onValueChange?.(val)}
          onSubmit={submitAnswer}
        />
      </div>
    </div>
  );
};

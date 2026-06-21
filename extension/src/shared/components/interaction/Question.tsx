/* @refresh reload */
import { createSignal, For, JSX, Show } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import {
  IS_ANDROID,
  saveAnswer,
} from "@src/dataInterface/commonSyncDataInterface";
import { nanoid } from "nanoid";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";
import Btn from "@src/shared/components/ui/Btn";

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

  const hasChips = (question.chips?.length ?? 0) > 0;

  // A tapped chip is the same answer a typed one would be: when the question
  // has a prompt prefix, append the chip to it so the saved text matches the
  // pre-filled input exactly. Submits immediately — taps are the whole point.
  const submitChip = (chip: string) => {
    props.onCancelCountdown();
    const answerTxt = question.prompt ? `${question.prompt} ${chip}` : chip;
    void submitAnswer(answerTxt);
  };

  return (
    <div id="minded-6622-question-wrapper">
      <div
        id="minded-6622-question"
        class="txtBig"
        classList={{ "show-input": getShowInput() }}
        // With chips the question is plain text — the chips (and "Something
        // else…") drive input — so it isn't a button. Without chips it stays
        // the tap-to-type reveal target it has always been.
        role={hasChips ? undefined : "button"}
        tabindex={hasChips ? undefined : getShowInput() ? -1 : 0}
        aria-expanded={hasChips ? undefined : getShowInput()}
        onClick={hasChips ? undefined : revealInput}
        onKeyDown={
          hasChips
            ? undefined
            : (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  revealInput();
                }
              }
        }
      >
        <span>{formatQuestionText(question.t)}</span>
      </div>

      <Show when={hasChips && !getShowInput()}>
        <div class="question-chips" onMouseEnter={props.onCancelCountdown}>
          <For each={question.chips}>
            {(chip) => (
              <Btn variant="toggle" small onClick={() => submitChip(chip)}>
                {chip}
              </Btn>
            )}
          </For>
          <Btn
            variant="toggle"
            small
            class="question-chip-other"
            onClick={revealInput}
          >
            Something else…
          </Btn>
        </div>
      </Show>

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

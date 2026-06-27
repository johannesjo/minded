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
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { withTargetName } from "@src/util/displayTargetName";

// Chip fade-out before the text input takes over; keep in sync with the
// `.question-chips.is-exiting` opacity transition in Question.scss.
const CHIPS_FADE_MS = 250;

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
  /** Name of the site/app this interaction is about; when set, the generic
   *  "this website"/"this app" in a prompt is shown as the real name. */
  targetName?: string;
}) => JSX.Element = (props) => {
  const question = props.initialQuestion;
  // Resolve the generic referent to the real site/app name once (the component
  // is re-created per question); display text and the saved-answer prompt must
  // use the same resolved string so a tapped chip and the shown prompt match.
  const displayText = withTargetName(question.t, props.targetName);
  const displayPrompt = question.prompt
    ? withTargetName(question.prompt, props.targetName)
    : undefined;
  const initialInputValue = displayPrompt
    ? displayPrompt + " "
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
    const normalizedPrompt = displayPrompt
      ? normalizeAnswerText(displayPrompt)
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
  const [getChipsExiting, setChipsExiting] = createSignal(false);

  // "Something else…" swaps the chips for the text input. Fade the chips out
  // first rather than snapping them away — calmness is the product, so even
  // this small swap softens (matches the input's own fade-in).
  const revealInputFromChips = () => {
    props.onCancelCountdown();
    setChipsExiting(true);
    setTimeout(revealInput, CHIPS_FADE_MS);
  };

  // A tapped chip is the same answer a typed one would be: when the question
  // has a prompt prefix, append the chip to it so the saved text matches the
  // pre-filled input exactly. Submits immediately — taps are the whole point.
  const submitChip = (chip: string) => {
    props.onCancelCountdown();
    const answerTxt = displayPrompt ? `${displayPrompt} ${chip}` : chip;
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
        <span>{formatQuestionText(displayText)}</span>
      </div>

      <Show when={hasChips && !getShowInput()}>
        <div
          class="question-chips"
          classList={{ "is-exiting": getChipsExiting() }}
          role="group"
          aria-label={formatQuestionText(displayText)}
          onMouseEnter={props.onCancelCountdown}
        >
          <For each={question.chips}>
            {(chip) => (
              // `toggle` is borrowed only for its compact pill shape — these
              // chips submit-and-dismiss and never show a selected state.
              <Btn variant="toggle" small onClick={() => submitChip(chip)}>
                {chip}
              </Btn>
            )}
          </For>
          <Btn
            variant="toggle"
            small
            class="question-chip-other"
            onClick={revealInputFromChips}
          >
            Something else…
          </Btn>
        </div>
      </Show>

      <div class="question-body">
        {/* Free-text questions (no chips) get a faint pen icon where the
            textarea's first line lands: it shows you can tap to write, and
            where, then fades out as the field fades in. Chips carry their own
            tappable affordance, so they skip the hint. The question div above is
            the labelled button, so the hint is decorative (aria-hidden) — a
            touch/mouse affordance only. */}
        <Show when={!hasChips}>
          <div
            class="question-tap-hint"
            classList={{ "input-shown": getShowInput() }}
            aria-hidden="true"
            onClick={revealInput}
          >
            <Ico name="pen" size={26} />
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
    </div>
  );
};

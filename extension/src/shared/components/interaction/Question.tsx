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
import { formatQuestionText } from "@src/util/formatQuestionText";

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
   *  "this website"/"this app" in the question text is shown as the real name. */
  targetName?: string;
}) => JSX.Element = (props) => {
  const question = props.initialQuestion;
  // Resolve the generic "this website"/"this app" referent to the real site/app
  // name for the *displayed question* only (recreated per question, so a
  // one-time read is fine). Deliberately NOT applied to `prompt`: the prompt
  // becomes part of the saved answer, and baking a specific host into stored
  // history would read wrong out of its moment - a stale, site-specific log
  // instead of the timeless reflection it's meant to be.
  const displayText = withTargetName(question.t, props.targetName);
  const initialInputValue = question.prompt
    ? question.prompt + " "
    : (props.initialValue ?? "");
  const [getInpEl, setInpEl] = createSignal<HTMLTextAreaElement | null>(null);
  const [getShowInput, setShowInput] = createSignal(false);

  const normalizeAnswerText = (txt: string): string =>
    (txt || "").replace(/\s+/g, " ").trim();

  const isAnswerReady = (answerTxt: string): boolean => {
    const normalizedVal = normalizeAnswerText(answerTxt);
    const normalizedPrompt = question.prompt
      ? normalizeAnswerText(question.prompt)
      : "";
    const remainderWhenPrefilled =
      normalizedPrompt && normalizedVal.startsWith(normalizedPrompt)
        ? normalizedVal.slice(normalizedPrompt.length).trim()
        : normalizedVal;

    if (!normalizedVal || normalizedVal.length < 2) return false;
    return !normalizedPrompt || remainderWhenPrefilled.length >= 2;
  };

  const submitAnswer = async (answerTxt: string) => {
    if (!isAnswerReady(answerTxt)) return;

    const answer = {
      questionCategoryId: question.categoryId,
      qid: question.id,
      val: answerTxt,
      ts: Date.now(),
      id: nanoid(),
    };
    if (!question.isDontSaveAnswer) {
      try {
        await saveAnswer(answer);
      } catch (e) {
        // The data layer already alerted the user that the answer was not
        // saved. Stay on the question with the text intact so they can retry
        // (or leave via the sun) - advancing would pretend the save happened.
        console.error("Answer save failed - staying on the question", e);
        return;
      }
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
  // first rather than snapping them away - calmness is the product, so even
  // this small swap softens (matches the input's own fade-in).
  const revealInputFromChips = () => {
    props.onCancelCountdown();
    setChipsExiting(true);
    setTimeout(revealInput, CHIPS_FADE_MS);
  };

  // A tapped chip is the same answer a typed one would be: when the question
  // has a prompt prefix, append the chip to it so the saved text matches the
  // pre-filled input exactly. Submits immediately - taps are the whole point.
  const submitChip = (chip: string) => {
    props.onCancelCountdown();
    const answerTxt = question.prompt ? `${question.prompt} ${chip}` : chip;
    void submitAnswer(answerTxt);
  };

  return (
    <div
      id="minded-6622-question-wrapper"
      classList={{ ["input-shown"]: getShowInput() }}
    >
      <div class="question-prompt-slot">
        <div
          id="minded-6622-question"
          class="txtBig"
          classList={{ "show-input": getShowInput() }}
          // With chips the question is plain text - the chips (and "Something
          // else…") drive input - so it isn't a button. Without chips it stays
          // the tap-to-type reveal target it has always been.
          role={hasChips || getShowInput() ? undefined : "button"}
          tabindex={hasChips || getShowInput() ? undefined : 0}
          aria-expanded={hasChips || getShowInput() ? undefined : false}
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
              // `toggle` is borrowed only for its compact pill shape - these
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
            the labelled button, so the hint is decorative (aria-hidden) - a
            touch/mouse affordance only. */}
        <Show when={!hasChips}>
          <div
            class="question-tap-hint"
            classList={{ "input-shown": getShowInput() }}
            aria-hidden="true"
            onClick={revealInput}
          >
            <Ico name="pen" size={30} />
          </div>
        </Show>

        <div
          class="question-input-container"
          classList={{ show: getShowInput() }}
          onMouseEnter={props.onCancelCountdown}
          onClick={props.onCancelCountdown}
        >
          <InputWithSend
            aria-labelledby="minded-6622-question"
            reflective
            autoGrow
            placeholder="write here…"
            isSubmitReady={isAnswerReady}
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

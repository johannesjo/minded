/* @refresh reload */
import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  QUESTION_CATEGORIES,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import { saveAnswer } from "@src/dataInterface/commonSyncDataInterface";
// @ts-expect-error
import { requestFocusAndShowKeyboard } from "@dataInterface/system";
import { nanoid } from "nanoid";
import {
  getQuestionSemiSmart,
  getQuestionSmart,
} from "@src/util/getQuestionSmart";
import { Ico } from "@src/shared/components/ui/Ico";

const MAX_SMART_QUESTION_ATTEMPTS = 3;

export const Question: (props: {
  isChangeQuestion?: boolean;
  initialQuestion: QuestionForPrompt;
  answers: Answer[];
  onSuccess: (answer: Answer) => void;
  onSkip: () => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  const [getQuestion, setQuestion] = createSignal(props.initialQuestion);
  const [getIsChangingQuestion, setIsChangingQuestion] = createSignal(false);
  let inpEl;
  let t0;
  let t1;
  let tChangeQuestion;

  let questionUpdateCount = 0;
  let questionIdBefore = props.initialQuestion.id;

  createEffect(() => {
    if (inpEl) {
      inpEl.value = props.initialQuestion.prompt
        ? props.initialQuestion.prompt + " "
        : "";
    }
  });

  createEffect(() => {
    const q = getQuestion();
    if (inpEl) {
      inpEl.value = q.prompt ? q.prompt + " " : "";
    }
  });

  const focusInp = () => {
    inpEl.focus();
    requestFocusAndShowKeyboard();
  };

  onMount(async () => {
    focusInp();
    // updatePrompt();
    t0 = setTimeout(() => focusInp(), 200);
    t1 = setTimeout(() => focusInp(), 600);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearTimeout(t1);
    window.clearTimeout(tChangeQuestion);
  });

  const submitAnswer = async (answerTxt: string) => {
    const q = getQuestion();
    const answer = {
      questionCategoryId: q.categoryId,
      qid: q.id,
      val: answerTxt,
      ts: Date.now(),
      id: nanoid(),
    };

    if (!answer.val || (answer.val as string).length < 2) {
      return;
    }
    setIsInputDisabled(true);
    const cat = QUESTION_CATEGORIES[props.initialQuestion.categoryId];
    if (!cat.isDontSaveQuestion) {
      await saveAnswer(answer);
    }
    props.onSuccess(answer);
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    const q = props.initialQuestion;
    if (!q) throw new Error("No initialQuestion");

    if (ev.key === "Enter") {
      submitAnswer((ev.target as HTMLInputElement).value);
    } else if (ev.key === "Escape") {
      props.onSkip();
    } else if (ev.key !== "Control") {
      props.onCancelCountdown();
    }
  };

  const updateQuestion = () => {
    const newQuestion =
      questionUpdateCount > MAX_SMART_QUESTION_ATTEMPTS
        ? getQuestionSemiSmart()
        : getQuestionSmart(props.answers);

    if (questionIdBefore === newQuestion.id) {
      questionUpdateCount++;
      updateQuestion();
    } else {
      questionIdBefore = newQuestion.id;
      questionUpdateCount++;
      setQuestion(newQuestion);
      props.onUpdateQuestion(newQuestion);
    }
  };

  return (
    <>
      <div
        id="minded-6622-question-wrapper"
        class={`${getIsChangingQuestion() ? "isChangingQuestion" : ""}`}
      >
        <div id="minded-6622-question" class="txtBig">
          <span>{getQuestion().t}?</span>
        </div>

        <div id="minded-6622-inp">
          <input
            ref={inpEl}
            type="text"
            disabled={getIsInputDisabled()}
            onkeypress={() => undefined}
            onmouseenter={props.onCancelCountdown}
            onclick={props.onCancelCountdown}
            onkeydown={onKeyDown}
            maxlength={500}
            autofocus={true}
          />
          <div
            onclick={() => {
              submitAnswer(inpEl?.value);
            }}
          >
            <Ico name="send" />
          </div>
        </div>
        {props.isChangeQuestion && (
          <div
            id="minded-6622-change-question-btn"
            onmouseenter={props.onCancelCountdown}
            onclick={() => {
              props.onCancelCountdown();
              setIsChangingQuestion(true);
              inpEl?.focus();
              tChangeQuestion = window.setTimeout(() => {
                updateQuestion();
                inpEl?.focus();
                setIsChangingQuestion(false);
              }, 100);
            }}
          >
            <Ico name="questionExchange" />
          </div>
        )}
      </div>
    </>
  );
};

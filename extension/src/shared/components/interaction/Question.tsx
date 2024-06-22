/* @refresh reload */
import { createEffect, createSignal, JSX, onCleanup } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import { saveAnswer } from "@src/dataInterface/commonSyncDataInterface";
import { nanoid } from "nanoid";
import {
  getQuestionSemiSmart,
  getQuestionSmart,
} from "@src/util/getQuestionSmart";
import { Ico } from "@src/shared/components/ui/Ico";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";

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
  const [getInpEl, setInpEl] = createSignal<HTMLInputElement | null>(null);
  const [getValue, setValue] = createSignal<string>("");

  let tChangeQuestion;

  let questionUpdateCount = 0;
  let questionIdBefore = props.initialQuestion.id;

  onCleanup(() => {
    window.clearTimeout(tChangeQuestion);
  });

  createEffect(() => {
    setValue(
      props.initialQuestion.prompt ? props.initialQuestion.prompt + " " : "",
    );
  });

  createEffect(() => {
    const q = getQuestion();
    setValue(q.prompt ? q.prompt + " " : "");
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
    if (!q.isDontSaveAnswer) {
      await saveAnswer(answer);
    }
    props.onSuccess(answer);
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
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

        <div
          onmouseenter={props.onCancelCountdown}
          onclick={props.onCancelCountdown}
        >
          <InputWithSend
            onKeyDown={onKeyDown}
            value={getValue()}
            isAutoFocus={true}
            isDisabled={getIsInputDisabled()}
            setRef={setInpEl}
            onSubmitClick={submitAnswer}
          />
        </div>

        {props.isChangeQuestion && (
          <div
            id="minded-6622-change-question-btn"
            ontouchstart={() => undefined}
            onmouseenter={props.onCancelCountdown}
            onclick={() => {
              props.onCancelCountdown();
              setIsChangingQuestion(true);
              getInpEl()?.focus();
              tChangeQuestion = window.setTimeout(() => {
                updateQuestion();
                getInpEl()?.focus();
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

/* @refresh reload */
import { createEffect, createSignal, JSX, onCleanup } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import {
  IS_ANDROID,
  saveAnswer,
} from "@src/dataInterface/commonSyncDataInterface";
import { nanoid } from "nanoid";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";
import "./Question.scss";

// const MAX_SMART_QUESTION_ATTEMPTS = 3;

export const Question: (props: {
  isChangeQuestion?: boolean;
  initialQuestion: QuestionForPrompt;
  answers: Answer[];
  onSuccess: (answer: Answer) => void;
  onSkip: () => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  // const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  const [getQuestion, setQuestion] = createSignal(props.initialQuestion);
  const [getIsChangingQuestion, setIsChangingQuestion] = createSignal(false);
  const [getInpEl, setInpEl] = createSignal<HTMLTextAreaElement | null>(null);
  const [getValue, setValue] = createSignal<string>("");
  const [getShowInput, setShowInput] = createSignal(false);

  let tChangeQuestion: NodeJS.Timeout;

  // let questionUpdateCount = 0;
  // let questionIdBefore = props.initialQuestion.id;

  onCleanup(() => {
    window.clearTimeout(tChangeQuestion);
  });

  createEffect(() => {
    const q = getQuestion();
    setValue(q.prompt ? q.prompt + " " : "");
  });

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
    console.log("Question: submitAnswer called with:", answerTxt);
    const q = getQuestion();
    const normalizedVal = normalizeAnswerText(answerTxt);
    const normalizedPrompt = q.prompt ? normalizeAnswerText(q.prompt) : "";
    const remainderWhenPrefilled =
      normalizedPrompt && normalizedVal.startsWith(normalizedPrompt)
        ? normalizedVal.slice(normalizedPrompt.length).trim()
        : normalizedVal;
    const answer = {
      questionCategoryId: q.categoryId,
      qid: q.id,
      val: answerTxt,
      ts: Date.now(),
      id: nanoid(),
    };

    if (!normalizedVal || normalizedVal.length < 2) {
      console.log("Question: answer too short, returning");
      return;
    }
    if (normalizedPrompt && remainderWhenPrefilled.length < 2) {
      console.log("Question: answer equals prompt only, returning");
      return;
    }
    if (!q.isDontSaveAnswer) {
      await saveAnswer(answer);
    }
    console.log("Question: calling props.onSuccess with answer:", answer);
    props.onSuccess(answer);
  };

  // const updateQuestion = () => {
  //   const newQuestion =
  //     questionUpdateCount > MAX_SMART_QUESTION_ATTEMPTS
  //       ? getQuestionSemiSmart()
  //       : getQuestionSmart(props.answers);
  //
  //   if (questionIdBefore === newQuestion.id) {
  //     questionUpdateCount++;
  //     updateQuestion();
  //   } else {
  //     questionIdBefore = newQuestion.id;
  //     questionUpdateCount++;
  //     setQuestion(newQuestion);
  //     props.onUpdateQuestion(newQuestion);
  //   }
  // };

  return (
    <>
      <div
        id="minded-6622-question-wrapper"
        class={`${getIsChangingQuestion() ? "isChangingQuestion" : ""}`}
      >
        <div
          id="minded-6622-question"
          class="txtBig"
          classList={{ "show-input": getShowInput() }}
          onClick={() => {
            if (!getShowInput()) {
              setShowInput(true);
              props.onCancelCountdown();
              // Focus input after it appears
              setTimeout(() => getInpEl()?.focus(), 100);
            }
          }}
        >
          <span>{formatQuestionText(getQuestion().t)}</span>
        </div>

        <div
          class="question-input-container"
          classList={{ show: getShowInput() }}
          onMouseEnter={props.onCancelCountdown}
          onClick={props.onCancelCountdown}
        >
          <InputWithSend
            onCancelCountdown={props.onCancelCountdown}
            value={getValue()}
            maxLength={500}
            isAutoFocus={!IS_ANDROID}
            setRef={setInpEl}
            onSubmit={submitAnswer}
          />
        </div>

        {/* Temporarily commented out - cycle through prompts button
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
        */}
      </div>
    </>
  );
};

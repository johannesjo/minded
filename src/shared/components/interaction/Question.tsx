/* @refresh reload */
import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  QUESTION_CATEGORIES,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/syncData";
import { saveAnswer } from "@src/shared/data/syncDataInterface";
import { nanoid } from "nanoid";

export const Question: (props: {
  question: QuestionForPrompt;
  onSuccess: (answer: Answer) => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
  onChangeQuestion: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  let inpEl;
  let t0;

  createEffect(() => {
    if (inpEl) {
      inpEl.value = props.question.prompt ? props.question.prompt + " " : "";
    }
  });

  onMount(async () => {
    console.log("Question Component Function onMount()");
    if (props.question.prompt && inpEl) {
      inpEl.value = props.question.prompt + " ";
    }
    inpEl.focus();
    t0 = setTimeout(() => inpEl.focus(), 250);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
  });

  const submitAnswer = async (answerTxt: string) => {
    alert(answerTxt);
    const q = props.question;
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
    const cat = QUESTION_CATEGORIES[props.question.categoryId];
    if (!cat.isDontSaveQuestion) {
      await saveAnswer(answer);
    }
    props.onSuccess(answer);
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    const q = props.question;
    if (!q) throw new Error("No question");

    if (ev.key === "Enter") {
      submitAnswer((ev.target as any).value);
    } else if (ev.key === "Escape") {
      props.onCancel();
    } else if (ev.key !== "Control") {
      props.onCancelCountdown();
    }
  };

  return (
    <>
      <div id="minded-6622-msg">
        <div id="minded-6622-question">{props.question.t}?</div>

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
            ➤
          </div>
        </div>
        <div
          id="minded-6622-change-question-btn"
          onmouseenter={props.onCancelCountdown}
          onclick={() => {
            props.onCancelCountdown();
            props.onChangeQuestion();
            inpEl?.focus();
          }}
        >
          ⇄
        </div>
      </div>
    </>
  );
};

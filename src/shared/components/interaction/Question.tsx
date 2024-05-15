/* @refresh reload */
import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  QUESTION_CATEGORIES,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
// @ts-ignore
import { saveAnswer } from "@dataInterface/syncDataInterface";
import { requestFocusAndShowKeyboard } from "@src/dataInterface/android/androidInterface";
import { nanoid } from "nanoid";
import { IS_ANDROID } from "@src/dataInterface/extension/isAndroid";

export const Question: (props: {
  question: QuestionForPrompt;
  onSuccess: (answer: Answer) => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
  onChangeQuestion?: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  let inpEl;
  let t0;
  let t1;

  createEffect(() => {
    if (inpEl) {
      inpEl.value = props.question.prompt ? props.question.prompt + " " : "";
    }
  });

  const focusInp = () => {
    inpEl.focus();
    if (IS_ANDROID) {
      requestFocusAndShowKeyboard();
    }
  };

  onMount(async () => {
    if (props.question.prompt && inpEl) {
      inpEl.value = props.question.prompt + " ";
    }
    t0 = setTimeout(() => focusInp(), 50);
    t1 = setTimeout(() => focusInp(), 400);
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearTimeout(t1);
  });

  const submitAnswer = async (answerTxt: string) => {
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
      props.onSkip();
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
        {props.onChangeQuestion && (
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
        )}
      </div>
    </>
  );
};

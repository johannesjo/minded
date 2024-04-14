/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
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
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  let inpEl;

  onMount(async () => {
    if (props.question.prompt && inpEl) {
      inpEl.value = props.question.prompt + " ";
    }
    inpEl.focus();
    setTimeout(() => inpEl.focus(), 250);
  });

  const submitAnswer = async (answer: Answer) => {
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
      submitAnswer({
        questionCategoryId: q.categoryId,
        val: (ev.target as any).value,
        ts: Date.now(),
        id: nanoid(),
      });
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
        <input
          ref={inpEl}
          type="text"
          disabled={getIsInputDisabled()}
          onkeypress={() => undefined}
          onmouseenter={props.onCancelCountdown}
          onclick={props.onCancelCountdown}
          onkeydown={onKeyDown}
          maxlength={500}
          id="minded-6622-inp"
          autofocus={true}
        />
      </div>
    </>
  );
};

/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/sync-data";
import { getSyncData, saveAnswer } from "@src/shared/data/dataInterface";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
import { nanoid } from "nanoid";

export const Question: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  const [getQuestion, setQuestion] = createSignal<QuestionForPrompt>(undefined);
  let inpEl;

  onMount(async () => {
    getSyncData().then((syncData) => {
      const question = getQuestionSmart(syncData.answers);

      if (question.prompt && inpEl) {
        inpEl.value = question.prompt + " ";
      }
      setQuestion(question);
      inpEl.focus();
      setTimeout(() => inpEl.focus(), 250);
    });
  });

  const submitAnswer = async (answer: Answer) => {
    if (!answer.val || (answer.val as string).length < 2) {
      return;
    }
    setIsInputDisabled(true);
    await saveAnswer(answer);
    props.onSuccess();
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    const q = getQuestion();
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
        <div id="minded-6622-question">{getQuestion()?.t}?</div>
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

/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { QUESTIONS } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/sync-data";
import { saveAnswer } from "@src/shared/data/dataInterface";
import { getRndEntry } from "@src/util/getRndEntry";

// once on app load
const rndQuestion = getRndEntry(QUESTIONS);

export const Question: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  let inpEl;

  onMount(async () => {
    inpEl.focus();
    setTimeout(() => inpEl.focus(), 250);
    if(rndQuestion.prompt) {
      inpEl.value = rndQuestion.prompt + " ";
    }
  });


  const submitAnswer = async (answer: Answer) => {
    if(!answer.val || answer.val.length < 2) {
      return;
    }
    setIsInputDisabled(true);
    await saveAnswer(answer);
    props.onSuccess();
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if(ev.key === "Enter") {
      submitAnswer({
        questionCategoryId: rndQuestion.categoryId,
        val: (ev.target as any).value,
        ts: Date.now(),
      });
    } else if(ev.key === "Escape") {
      props.onCancel();
    } else if(ev.key !== "Control") {
      props.onCancelCountdown();
    }
  };

  return (
    <>
      <div id="minded-6622-msg">
        <div id="minded-6622-question">{rndQuestion.t}?</div>
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
          autoFocus
        />
      </div>
    </>
  );
};

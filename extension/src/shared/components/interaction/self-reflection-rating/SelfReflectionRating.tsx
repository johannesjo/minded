import { createSignal, JSX, onMount } from "solid-js";
import {
  SELF_REFLECTION_ANSWERS,
  SELF_REFLECTION_QUESTIONS,
  SelfReflectionAnswer,
  SelfReflectionAnswerVal,
} from "./selfReflection.model";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";

const SelfReflectionRating = (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}): JSX.Element => {
  const [getSelectedQuestion, setSelectedQuestion] = createSignal(
    SELF_REFLECTION_QUESTIONS[0],
  );
  const [getSelectedAnswerVal, setSelectedAnswerVal] =
    createSignal<SelfReflectionAnswerVal | null>(null);

  onMount(() => {
    const randomIndex = Math.floor(
      Math.random() * SELF_REFLECTION_QUESTIONS.length,
    );
    setSelectedQuestion(SELF_REFLECTION_QUESTIONS[randomIndex]);
  });

  const handleAnswerClick = (answer: SelfReflectionAnswer) => {
    setSelectedAnswerVal(answer.val);
  };

  const handleSaveClick = () => {
    if (getSelectedAnswerVal()) {
      // Reset the selected question and answer
      // const randomIndex = Math.floor(
      //   Math.random() * SELF_REFLECTION_QUESTIONS.length,
      // );
      // setSelectedQuestion(SELF_REFLECTION_QUESTIONS[randomIndex]);
      setSelectedAnswerVal(null);
      props.onSuccess();
    }
  };

  return (
    <div onmousemove={props.onCancelCountdown}>
      <div class="minded-6622-txt-big" style="padding-bottom: 32px;">
        Recently {getSelectedQuestion().question}
      </div>

      {SELF_REFLECTION_ANSWERS.map((answer) => (
        <button
          class={
            getSelectedAnswerVal() === answer.val
              ? "btn-toggle-select  isSelected"
              : "btn-toggle-select"
          }
          onClick={() => handleAnswerClick(answer)}
        >
          {answer.txt}
        </button>
      ))}

      <div>
        <ButtonWrapper isVisible={!!getSelectedAnswerVal()}>
          <button
            class="btn-big"
            onClick={handleSaveClick}
            disabled={!getSelectedAnswerVal()}
          >
            ➤ Save
          </button>
        </ButtonWrapper>

        <div
          style={`padding-top: 48px; pointer-events:all; display: inline-block; ${!getSelectedAnswerVal() ? "visibility: hidden" : ""}`}
          class={
            getSelectedAnswerVal()
              ? "save-btn-wrapper isVisible"
              : "save-btn-wrapper"
          }
        ></div>
      </div>
    </div>
  );
};

export default SelfReflectionRating;

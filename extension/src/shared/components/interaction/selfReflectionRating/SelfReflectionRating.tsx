import { createSignal, JSX, onMount } from "solid-js";
import {
  SELF_REFLECTION_ANSWERS,
  SELF_REFLECTION_QUESTIONS,
  SelfReflectionAnswerVal,
} from "./selfReflection.model";
import { SaveBtn } from "@src/shared/components/ui/SaveBtn";
import TglBtns from "@src/shared/components/ui/TglBtns";

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

  const handleSaveClick = () => {
    if (getSelectedAnswerVal()) {
      setSelectedAnswerVal(null);
      props.onSuccess();
    }
  };

  return (
    <div onmousemove={props.onCancelCountdown}>
      <div class="txtBig" style="padding-bottom: 32px;">
        Recently {getSelectedQuestion().question}
      </div>

      <TglBtns
        options={SELF_REFLECTION_ANSWERS}
        onSelect={(v) => setSelectedAnswerVal(v)}
      />

      <SaveBtn onSave={handleSaveClick} isVisible={!!getSelectedAnswerVal()} />
    </div>
  );
};

export default SelfReflectionRating;

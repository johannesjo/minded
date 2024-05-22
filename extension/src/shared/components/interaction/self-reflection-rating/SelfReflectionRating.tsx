import { createSignal, JSX, onMount } from "solid-js";
import {
  SELF_REFLECTION_ANSWERS,
  SELF_REFLECTION_QUESTIONS,
  SelfReflectionAnswer,
} from "./selfReflection.model";

const SelfReflectionRating = (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}): JSX.Element => {
  const [selectedQuestion, setSelectedQuestion] = createSignal(
    SELF_REFLECTION_QUESTIONS[0],
  );
  const [selectedAnswer, setSelectedAnswer] =
    createSignal<SelfReflectionAnswer | null>(null);

  onMount(() => {
    const randomIndex = Math.floor(
      Math.random() * SELF_REFLECTION_QUESTIONS.length,
    );
    setSelectedQuestion(SELF_REFLECTION_QUESTIONS[randomIndex]);
  });

  const handleAnswerClick = (answer: SelfReflectionAnswer) => {
    setSelectedAnswer(answer);
  };

  const handleSaveClick = () => {
    if (selectedAnswer()) {
      // Submit the selected answer here
      console.log(
        `Question: ${selectedQuestion().question}, Answer: ${selectedAnswer().txt}`,
      );

      // Reset the selected question and answer
      const randomIndex = Math.floor(
        Math.random() * SELF_REFLECTION_QUESTIONS.length,
      );
      setSelectedQuestion(SELF_REFLECTION_QUESTIONS[randomIndex]);
      setSelectedAnswer(null);
    }
  };

  return (
    <div>
      <h2>{selectedQuestion().question}</h2>
      {SELF_REFLECTION_ANSWERS.map((answer) => (
        <button onClick={() => handleAnswerClick(answer)}>{answer.txt}</button>
      ))}
      <button onClick={handleSaveClick} disabled={!selectedAnswer()}>
        Save
      </button>
    </div>
  );
};

export default SelfReflectionRating;

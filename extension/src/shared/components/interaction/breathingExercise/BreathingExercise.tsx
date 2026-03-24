import { createEffect, createSignal, onCleanup } from "solid-js";

const BreathingExercise = () => {
  const [stage, setStage] = createSignal("Ready");
  const [timeLeft, setTimeLeft] = createSignal(0);

  const stages = [
    { name: "Breathing in", duration: 4 },
    { name: "Hold", duration: 7 },
    { name: "Breathing out", duration: 8 },
  ];

  let currentStageIndex = -1;
  let intervalId: NodeJS.Timeout | null = null;

  const startExercise = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    currentStageIndex = 0;
    setStage(stages[currentStageIndex].name);
    setTimeLeft(stages[currentStageIndex].duration);
    intervalId = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
  };

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  createEffect(() => {
    if (timeLeft() === 0 && currentStageIndex !== -1) {
      currentStageIndex = (currentStageIndex + 1) % stages.length;
      setStage(stages[currentStageIndex].name);
      setTimeLeft(stages[currentStageIndex].duration);
    }
  });

  return (
    <div id="minded-6622-coloured-wrapper">
      <h1>{stage()}</h1>
      <p>{timeLeft()} seconds left</p>
      <button onClick={startExercise} class="btnTxt">
        Start
      </button>
    </div>
  );
};

export default BreathingExercise;

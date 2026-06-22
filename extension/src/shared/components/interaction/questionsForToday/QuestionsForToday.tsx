import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { QUESTIONS } from "@src/shared/data/questions";
import { Component } from "solid-js";

export const QuestionsForToday: Component = () => {
  return (
    <div id="minded-6622-questions-for-today">
      <h2 class="h2">Questions for Today</h2>

      <EnergyLvlInteraction
        onCancelCountdown={() => undefined}
        onSuccess={() => undefined}
        onSkip={() => undefined}
      />
      <Question
        initialQuestion={QUESTIONS[10]}
        onSuccess={() => undefined}
        onSkip={() => undefined}
        onCancelCountdown={() => undefined}
        answers={[]}
        onUpdateQuestion={() => undefined}
      />
      <Question
        initialQuestion={QUESTIONS[14]}
        onSuccess={() => undefined}
        onSkip={() => undefined}
        onCancelCountdown={() => undefined}
        answers={[]}
        onUpdateQuestion={() => undefined}
      />
    </div>
  );
};

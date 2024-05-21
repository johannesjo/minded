import { MoodCheckin } from "@src/shared/components/interaction/mood-checkin/MoodCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energy-lvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { QUESTIONS } from "@src/shared/data/questions";
import { Component } from "solid-js";
import "./QuestionsForToday.scss";

export const QuestionsForToday: Component<any> = (props) => {
  return (
    <div id="minded-6622-questions-for-today">
      <h2>Questions for Today</h2>
      <MoodCheckin
        onCancelCountdown={() => undefined}
        onSuccess={() => undefined}
        onSkip={() => undefined}
      />
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
        isChangeQuestion={false}
        answers={[]}
        onUpdateQuestion={() => undefined}
      />
      <Question
        initialQuestion={QUESTIONS[14]}
        onSuccess={() => undefined}
        onSkip={() => undefined}
        onCancelCountdown={() => undefined}
        isChangeQuestion={false}
        answers={[]}
        onUpdateQuestion={() => undefined}
      />
    </div>
  );
};

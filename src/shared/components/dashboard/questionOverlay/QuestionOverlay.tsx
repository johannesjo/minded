import { createSignal, JSX } from "solid-js";
// @ts-ignore
import { Question } from "@src/shared/components/interaction/Question";
import { getRndIndex } from "@src/util/getRndEntry";
import { QUESTIONS } from "@src/shared/data/questions";
// @ts-ignore
import { getSyncData } from "@dataInterface/android/syncDataInterface";
import { fadeOut } from "@src/util/animation";
// @ts-ignore
import styles from "./QuestionOverlay.module.scss";

export const QuestionOverlay: (props: {
  onHideQuestion: () => void;
}) => JSX.Element = (props) => {
  let wrapperEl;

  const [getQuestionIndex, setQuestionIndex] = createSignal<number>(
    getRndIndex(QUESTIONS),
  );

  const nextQuestion = () => {
    let newIndex = getQuestionIndex() + 1;
    if (newIndex > QUESTIONS.length) {
      newIndex = 0;
    }
    setQuestionIndex(newIndex);
  };

  return (
    <div
      class={styles.questionIOverlay}
      id="minded-6622-coloured-wrapper-dynamic"
      ref={wrapperEl}
      onclick={async (ev) => {
        if (
          (ev.target as HTMLElement)?.id ===
          "minded-6622-coloured-wrapper-dynamic"
        ) {
          await fadeOut(wrapperEl, 150).promise;
          props.onHideQuestion();
        }
      }}
    >
      <div class={styles.questionWrapper}>
        <Question
          question={QUESTIONS[getQuestionIndex()]}
          onCancelCountdown={() => undefined}
          onSuccess={() => props.onHideQuestion()}
          onChangeQuestion={() => nextQuestion()}
          onSkip={() => undefined}
        />
      </div>
    </div>
  );
};

export default QuestionOverlay;

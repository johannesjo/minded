/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";

const questionId = window.location.hash.replace("#", "");
if (questionId) {
  console.log("QUESTION ID FOUND", questionId);
}

const InteractionAndroid = () => {
  const question: QuestionForPrompt | null = questionId?.length
    ? QUESTIONS.find((q) => q.id === questionId)
    : null;
  let wrapperEl;

  onMount(async () => {
    addWrapperClasses();
  });

  const onUpdateQuestion = (rndQuestion: QuestionForPrompt) => {
    androidInterface.setQuestion(JSON.stringify(rndQuestion));
  };

  const onSkip = () => {
    androidInterface.onSkip();
  };

  const showLittleSunAfter = () => {
    setTimeout(() => {
      androidInterface.hideWindow();
      androidInterface.showLittleSun();
    }, 100);
  };

  return (
    <div
      ref={wrapperEl}
      id="minded-6622-coloured-wrapper-dynamic"
      onClick={async (ev) => {
        if (
          (ev.target as HTMLElement)?.id ===
          "minded-6622-coloured-wrapper-dynamic"
        ) {
          await fadeOut(wrapperEl, 400).promise;
          showLittleSunAfter();
        }
      }}
    >
      <InteractionCommon
        isInitFadeout={false}
        wrapperEl={wrapperEl}
        onModeSet={(mode) => {
          if (mode !== "QUESTION") {
            androidInterface.unsetQuestion();
          }
        }}
        questionForPrompt={question}
        onSetAnswer={(txt) => androidInterface.setAnswerTxt(txt)}
        onAfterInteractionFadeout={() => showLittleSunAfter()}
        onSkip={onSkip}
        onUpdateQuestion={onUpdateQuestion}
        onSwipeDown={() => androidInterface.hideWindow()}
        onSwipeUp={() => androidInterface.hideWindow()}
      />
    </div>
  );
};

export default InteractionAndroid;

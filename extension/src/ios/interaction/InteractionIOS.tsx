/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
// import { iosInterface } from "@src/dataInterface/ios/iosInterface";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";

const questionId = window.location.hash.replace("#", "");
if (questionId) {
  console.log("QUESTION ID FOUND", questionId);
}

const InteractionIOS = () => {
  const question: QuestionForPrompt | null = questionId?.length
    ? QUESTIONS.find((q) => q.id === questionId)
    : null;
  let wrapperEl;

  onMount(async () => {
    addWrapperClasses();
  });

  const onUpdateQuestion = (rndQuestion: QuestionForPrompt) => {
    // iosInterface.setQuestion(JSON.stringify(rndQuestion));
  };

  const onSkip = () => {
    // iosInterface.onSkip();
  };

  const showLittleSunAfter = () => {
    // MOTE: we need to wait just a little extra otherwise ios throws an error that we are still drawing
    setTimeout(() => {
      // iosInterface.hideWindow();
      // iosInterface.showLittleSun();
    }, 100);
  };

  // TODO add app name
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
            // iosInterface.unsetQuestion();
          }
        }}
        questionForPrompt={question}
        onSuccessSunTap={() => {
          countSunTap();
          // iosInterface.onSuccessSunTap();
        }}
        // onSetAnswer={(txt) => iosInterface.setAnswerTxt(txt)}
        onSetAnswer={() => undefined}
        onAfterInteractionFadeout={() => showLittleSunAfter()}
        onAfterSuccessSunFadeout={() => showLittleSunAfter()}
        onSkip={onSkip}
        onUpdateQuestion={onUpdateQuestion}
      />
    </div>
  );
};

export default InteractionIOS;

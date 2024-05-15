/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { countBlockedAttempt } from "@src/dataInterface/android/syncDataInterface";

const InteractionAndroid = () => {
  let wrapperEl;

  onMount(async () => {
    addDayTimeDependentClass();
  });

  const onUpdateQuestion = (rndQuestion: QuestionForPrompt) => {
    androidInterface.setQuestion(JSON.stringify(rndQuestion));
  };

  const onSkip = () => {
    androidInterface.onSkip();
  };

  const showLittleSunAfter = () => {
    // MOTE: we need to wait just a little extra otherwise android throws an error that we are still drawing
    setTimeout(() => {
      androidInterface.hideWindow();
      androidInterface.showLittleSun();
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
        onModeSet={() => undefined}
        questionForPrompt={undefined}
        onSuccessSunTap={() => {
          countBlockedAttempt();
          androidInterface.onSuccessSunTap();
        }}
        onSetAnswer={(txt) => androidInterface.setAnswerTxt(txt)}
        onAfterInteractionFadeout={() => showLittleSunAfter()}
        onAfterSuccessSunFadeout={() => showLittleSunAfter()}
        onSkip={onSkip}
        onUpdateQuestion={onUpdateQuestion}
      />
    </div>
  );
};

export default InteractionAndroid;

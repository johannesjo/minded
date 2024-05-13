/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { androidInterface } from "@src/dataInterface/android/system";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";

const InteractionWindow = () => {
  let wrapperEl;

  onMount(async () => {
    addDayTimeDependentClass();
  });

  const onSuccessSunTap = () => {
    androidInterface.onSuccessSunTap();
  };

  const onUpdateQuestion = (rndQuestion: QuestionForPrompt) => {
    androidInterface.setQuestion(JSON.stringify(rndQuestion));
    androidInterface.setLittleSunTxt(rndQuestion.t + "?");
  };

  const onSkip = () => {
    androidInterface.onSkip();
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
          androidInterface.hideWindow();
        }
      }}
    >
      <InteractionCommon
        wrapperEl={wrapperEl}
        onModeSet={() => undefined}
        onSuccessSunTap={onSuccessSunTap}
        onUpdateLittleSunTxt={androidInterface.setLittleSunTxt}
        onAfterSuccessSunFadeout={androidInterface.hideWindow}
        onSkip={onSkip}
        onUpdateQuestion={onUpdateQuestion}
      />
    </div>
  );
};

export default InteractionWindow;

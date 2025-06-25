/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";
import { MindedIOSPlugin } from "@src/ios/plugin/MindedIOSPlugin";

const questionId = window.location.hash.replace("#", "");
if (questionId) {
  console.log("QUESTION ID FOUND", questionId);
}

const InteractionIOS = () => {
  const question: QuestionForPrompt | null = questionId?.length
    ? QUESTIONS.find((q) => q.id === questionId)
    : null;
  let wrapperEl;

  const continueToApp = () => {
    // continue to main instead since continue to app is not working
    // window.location.hash = "";
    // MindedIOSPlugin.continueToApp();
  };

  onMount(async () => {
    addWrapperClasses();
    MindedIOSPlugin.continueToApp();
  });

  const onUpdateQuestion = (rndQuestion: QuestionForPrompt) => {};

  const onSwipeDown = () => {
    window.location.hash = "";
  };

  const onSwipeUp = () => {
    window.location.hash = "";
  };

  return (
    <div
      ref={wrapperEl}
      id="minded-6622-coloured-wrapper-dynamic"
      onClick={async (ev) => {
        // if (
        //   (ev.target as HTMLElement)?.id ===
        //   "minded-6622-coloured-wrapper-dynamic"
        // ) {
        //   await fadeOut(wrapperEl, 400).promise;
        //   continueToApp();
        // }
      }}
    >
      <InteractionCommon
        isInitFadeout={false}
        wrapperEl={wrapperEl}
        onModeSet={() => undefined}
        questionForPrompt={question}
        onSetAnswer={() => undefined}
        onAfterInteractionFadeout={() => continueToApp()}
        onSkip={() => MindedIOSPlugin.continueToApp()}
        onUpdateQuestion={onUpdateQuestion}
        onSwipeDown={onSwipeDown}
        onSwipeUp={onSwipeUp}
      />
    </div>
  );
};

export default InteractionIOS;

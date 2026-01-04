/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import {
  countSunTap,
  getSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { MindedIOSPlugin } from "@src/ios/plugin/MindedIOSPlugin";
import { isRestOfDayActive } from "@src/util/isRestOfDayActive";

const questionId = window.location.hash.replace("#", "");
if (questionId) {
  console.log("QUESTION ID FOUND", questionId);
}

const InteractionIOS = () => {
  const question: QuestionForPrompt | null = questionId?.length
    ? QUESTIONS.find((q) => q.id === questionId) || null
    : null;
  let wrapperEl: HTMLDivElement = undefined!;

  const continueToApp = () => {
    // continue to main instead since continue to app is not working
    // window.location.hash = "";
    // MindedIOSPlugin.continueToApp();
  };

  onMount(async () => {
    addWrapperClasses();

    // Rest-of-day mode: immediately continue to app
    const syncData = await getSyncData();
    if (isRestOfDayActive(syncData)) {
      MindedIOSPlugin.continueToApp();
      return;
    }

    MindedIOSPlugin.continueToApp();
  });

  const onUpdateQuestion = (rndQuestion: QuestionForPrompt) => {};

  const onFlingAway = () => {
    window.location.hash = "";
  };

  const onDragComplete = () => {
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
        wrapperEl={wrapperEl!}
        onModeSet={() => undefined}
        questionForPrompt={question || undefined}
        onSetAnswer={() => undefined}
        onAfterInteractionFadeout={() => continueToApp()}
        onInteractionSubmitted={() => {
          // Called when user completes the interaction (answers question and drags sun)
          countSunTap();
          console.log("Interaction completed on iOS");
        }}
        onSkip={() => MindedIOSPlugin.continueToApp()}
        onUpdateQuestion={onUpdateQuestion}
        onFlingAway={onFlingAway}
        onDragComplete={onDragComplete}
      />
    </div>
  );
};

export default InteractionIOS;

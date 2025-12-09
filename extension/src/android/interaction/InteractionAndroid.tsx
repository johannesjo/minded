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
    ? QUESTIONS.find((q) => q.id === questionId) || null
    : null;
  let wrapperEl: HTMLDivElement = undefined!;

  onMount(async () => {
    addWrapperClasses();

    // Handle keyboard viewport changes smoothly
    let lastHeight = window.innerHeight;
    const handleViewportChange = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = lastHeight - currentHeight;

      // Keyboard is showing if height decreased
      if (heightDiff > 100) {
        // Add class to handle keyboard state
        document.body.classList.add("keyboard-visible");

        // Smoothly adjust content position
        const wrapper = document.getElementById(
          "minded-6622-interaction-wrapper-box",
        );
        if (wrapper) {
          wrapper.style.paddingBottom = `${heightDiff / 2}px`;
        }
      } else if (heightDiff < -100) {
        // Keyboard is hiding
        document.body.classList.remove("keyboard-visible");

        const wrapper = document.getElementById(
          "minded-6622-interaction-wrapper-box",
        );
        if (wrapper) {
          wrapper.style.paddingBottom = "0";
        }
      }

      lastHeight = currentHeight;
    };

    // Listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
    } else {
      window.addEventListener("resize", handleViewportChange);
    }

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleViewportChange,
        );
      } else {
        window.removeEventListener("resize", handleViewportChange);
      }
    };
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

  const onSetSessionLimit = (seconds: number) => {
    console.log("onSetSessionLimit called with seconds:", seconds);
    androidInterface.setSessionLimit(seconds);
    console.log("androidInterface.setSessionLimit called");
  };

  return (
    <div ref={wrapperEl} id="minded-6622-coloured-wrapper-dynamic">
      <InteractionCommon
        isInitFadeout={false}
        wrapperEl={wrapperEl!}
        onModeSet={(mode) => {
          if (mode !== "QUESTION") {
            androidInterface.unsetQuestion();
          }
        }}
        questionForPrompt={question || undefined}
        onSetAnswer={(txt) => androidInterface.setAnswerTxt(txt)}
        onAfterInteractionFadeout={() => showLittleSunAfter()}
        onInteractionSubmitted={() => {
          // Called when user completes the interaction (answers question and drags sun)

          console.log("Interaction completed on Android");
        }}
        onSkip={onSkip}
        onUpdateQuestion={onUpdateQuestion}
        onFlingAway={() => androidInterface.closeCurrentApp()}
        onDragComplete={() => androidInterface.closeCurrentApp()}
        onSetSessionLimit={onSetSessionLimit}
      />
    </div>
  );
};

export default InteractionAndroid;

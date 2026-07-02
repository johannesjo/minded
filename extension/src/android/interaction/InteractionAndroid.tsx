/* @refresh reload */
import { onMount } from "solid-js";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";
import { SessionIntent } from "@src/dataInterface/syncData";
import { createAndroidSessionLimitPayload } from "@src/shared/components/interaction/sessionLimit";

const questionId = window.location.hash.replace("#", "");

// The native side appends `?morphInFromCorner=1` when it re-opens this
// interaction because a Little Sun session timer ran out, so the sun arrives by
// gliding out of the (native) Little Sun's corner — the mirror of the depart
// hand-off — rather than snapping in centred. Read once at module load: the
// WebView is recreated fresh per show, so the URL is the launch context.
const morphInFromCorner =
  new URLSearchParams(window.location.search).get("morphInFromCorner") === "1";

const InteractionAndroid = () => {
  const question: QuestionForPrompt | null = questionId?.length
    ? QUESTIONS.find((q) => q.id === questionId) || null
    : null;
  let wrapperEl: HTMLDivElement = undefined!;

  // On a reverse morph, tell the native side once our sun has painted at the
  // corner, so it can cross-fade out the placeholder disc it holds there during
  // the WebView load. Two frames after mount the arriving sun has snapped to the
  // corner and painted; the native cross-fade is forgiving of slight timing since
  // both discs sit at the same spot. Guarded — older native builds lack it.
  if (morphInFromCorner) {
    onMount(() => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => androidInterface.onArrivingSunReady?.()),
      );
    });
  }

  onMount(() => {
    addWrapperClasses();
    // No per-screen keyboard handling: the native window insets (adjustResize +
    // imePadding) reflow the WebView so the centred interaction box recentres
    // above the keyboard on its own, and setupKeyboardScrolling (visualViewport)
    // keeps the focused field in view. The old pixel-threshold viewport listener
    // that also padded the box (and fought those systems) is gone — see #121.
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

  const onSetSessionLimit = (seconds: number, intent?: SessionIntent) => {
    androidInterface.setSessionLimit(
      createAndroidSessionLimitPayload(seconds, intent),
    );
  };

  return (
    <div ref={wrapperEl} id="minded-6622-coloured-wrapper-dynamic">
      <InteractionCommon
        isInitFadeout={false}
        wrapperEl={wrapperEl!}
        interactionPlatform="android"
        onModeSet={(mode) => {
          if (mode !== "QUESTION") {
            androidInterface.unsetQuestion();
          }
        }}
        questionForPrompt={question || undefined}
        morphInFromCorner={morphInFromCorner}
        onSetAnswer={(txt) => androidInterface.setAnswerTxt(txt)}
        onAfterInteractionFadeout={() => showLittleSunAfter()}
        onInteractionSubmitted={() => {
          // Called when user completes the interaction (answers question and drags sun)
          countSunTap();
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

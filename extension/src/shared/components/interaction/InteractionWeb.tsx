/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { fadeOut } from "@src/util/animation";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { closeTab } from "@src/dataInterface/extension/extensionApi";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { IS_MOUSE_PRIMARY } from "@src/util/touch";

// NOTE: val also needs to be set in css

export const InteractionWeb: (props: {
  host: string;
  onHideAll: () => void;
}) => JSX.Element = (props) => {
  // const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getQuestion, setQuestion] = createSignal<QuestionForPrompt>();

  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getLittleSunTxt, setLittleSunTxt] = createSignal<string>("");
  const [getIsShowBlackScreen, setIsShowBlackScreen] = createSignal(false);

  let wrapperEl;

  onMount(async () => {
    // give a moment time for rendering
    setTimeout(() => {
      stopAllVideos();
    }, 1000);

    setTimeout(() => {
      stopAllVideos();
    }, 2000);

    setTimeout(() => {
      stopAllVideos();
    }, 5000);
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });


  const teardown = () => {
    console.log('InteractionWeb: teardown called - hiding interaction');
    console.trace('Teardown call stack');
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOut(wrapperEl, 150);
    }
  };

  return (
    <>
      {getIsShowLittleSun() ? (
        <LittleSunComponent
          host={props.host}
          wasAnswerGiven={getWasAnswerGiven()}
          bubbleTxt={getLittleSunTxt()}
          teardown={teardown}
          onShowFreshInteraction={() => {
            setIsShowLittleSun(false);
            setQuestion(undefined);
            stopAllVideos();
          }}
          onShowQuestionAgain={() => {
            setIsShowLittleSun(false);
          }}
        />
      ) : (
        <div class="aniIn">
          <div
            id="minded-6622-coloured-wrapper-dynamic"
            onclick={(ev) => {
              // Background click disabled - only gesture controls
              ev.stopPropagation();
            }}
            ref={wrapperEl}
          >
            <InteractionCommon
              questionForPrompt={getQuestion()}
              isInitFadeout={false}
              wrapperEl={wrapperEl}
              onSetAnswer={setLittleSunTxt}
              onModeSet={(mode) => {
                if (mode !== "QUESTION") {
                  setLittleSunTxt("");
                }
              }}
              onAfterInteractionFadeout={() => {
                setIsShowLittleSun(true);
              }}
              onSkip={() => {
                console.log('InteractionWeb: onSkip called, tearing down interaction');
                teardown();
              }}
              onUpdateQuestion={(question) => {
                setQuestion(question);
                setLittleSunTxt(question?.t + "?");
              }}
              onSwipeDown={() => {
                console.log('InteractionWeb: onSwipeDown called, closing tab');
                closeTab();
              }}
              onSwipeUp={() => {
                console.log('InteractionWeb: onSwipeUp called, showing little sun');
                setIsShowLittleSun(true);
              }}
            />
          </div>
        </div>
      )}

      {getIsShowBlackScreen() && <div id="minded-6622-black-screen"></div>}
    </>
  );
};

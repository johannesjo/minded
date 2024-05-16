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
    console.log("InteractionWeb onMount()");

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

  const onSuccessSunTap = () => {
    closeTab();
  };

  const teardown = () => {
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
        <div
          id="minded-6622-coloured-wrapper-dynamic"
          onclick={(ev) => {
            if (
              (ev.target as HTMLElement)?.id ===
              "minded-6622-coloured-wrapper-dynamic"
            ) {
              setIsShowBlackScreen(true);

              setTimeout(() => {
                // fadeOutInteractionWrapper();
                wrapperEl.style.display = "none";
                setTimeout(() => {
                  setIsShowBlackScreen(false);
                  setIsShowLittleSun(true);
                }, 300);
              }, 300);
            }
          }}
          ref={wrapperEl}
        >
          <InteractionCommon
            questionForPrompt={getQuestion()}
            isInitFadeout={IS_MOUSE_PRIMARY}
            wrapperEl={wrapperEl}
            onSetAnswer={setLittleSunTxt}
            onModeSet={(mode) => {
              if (mode !== "QUESTION") {
                setLittleSunTxt("");
              }
            }}
            onAfterSuccessSunFadeout={() =>
              fadeOut(wrapperEl, 150).promise.then(() => {
                setIsShowLittleSun(true);
              })
            }
            onAfterInteractionFadeout={() => {
              setIsShowLittleSun(true);
            }}
            onSuccessSunTap={onSuccessSunTap}
            onSkip={() => {
              setIsShowLittleSun(true);
            }}
            onUpdateQuestion={(question) => {
              setQuestion(question);
              setLittleSunTxt(question?.t + "?");
            }}
          />
        </div>
      )}

      {getIsShowBlackScreen() && <div id="minded-6622-black-screen"></div>}
    </>
  );
};

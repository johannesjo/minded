/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { fadeOut } from "@src/util/animation";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { closeTab } from "@src/dataInterface/extension/extensionApi";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { IS_MOUSE_PRIMARY } from "@src/util/touch";
import { isDarkModeNow } from "@src/shared/addWrapperClasses";
import {
  updateHostsEntry,
  loadDataForHost,
} from "@dataInterface/localDataInterface";

// NOTE: val also needs to be set in css

export const InteractionWeb: (props: {
  host: string;
  onHideAll: () => void;
  shadowRoot?: ShadowRoot;
}) => JSX.Element = (props) => {
  // const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getQuestion, setQuestion] = createSignal<QuestionForPrompt>();

  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getIsShowBlackScreen, setIsShowBlackScreen] = createSignal(false);

  let wrapperEl: HTMLDivElement = undefined!;

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
    console.log("InteractionWeb: teardown called - hiding interaction");
    console.trace("Teardown call stack");
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOut(wrapperEl, 150);
    }
  };

  const setSessionLimit = async (seconds: number) => {
    const now = Date.now();
    const endTs =
      seconds < 0
        ? (() => {
            const endOfDay = new Date();
            endOfDay.setHours(24, 0, 0, 0);
            return endOfDay.getTime();
          })()
        : now + seconds * 1000;

    await updateHostsEntry(props.host, {
      sessionLimitInS: seconds,
      sessionEndTS: endTs,
      lastUsedTS: now,
      sessionDurationInS: 0,
    });

    // Ensure we tear down any stale question state
    setQuestion(undefined);
    stopAllVideos();
    setIsShowLittleSun(true);
  };

  onMount(async () => {
    // If there's already an active conscious intent session, start in Little Sun mode
    const data = await loadDataForHost(props.host);
    if (data?.sessionEndTS && Date.now() < data.sessionEndTS) {
      setIsShowLittleSun(true);
    }
  });

  return (
    <>
      {getIsShowLittleSun() ? (
        <div class="aniIn" style={{ opacity: "1" }}>
          <LittleSunComponent
            host={props.host}
            teardown={teardown}
            onShowFreshInteraction={() => {
              setIsShowLittleSun(false);
              setQuestion(undefined);
              stopAllVideos();
            }}
          />
        </div>
      ) : (
        <div class="aniIn">
          <div
            id="minded-6622-coloured-wrapper-dynamic"
            class={isDarkModeNow() ? "minded-6622-dark" : ""}
            style={{ opacity: "1" }}
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
              shadowRoot={props.shadowRoot}
              onSetAnswer={() => {}}
              onModeSet={() => {}}
              onAfterInteractionFadeout={() => {
                setIsShowLittleSun(true);
              }}
              onSkip={() => {
                console.log(
                  "InteractionWeb: onSkip called, showing little sun",
                );
                setIsShowLittleSun(true);
              }}
              onUpdateQuestion={(question) => {
                setQuestion(question);
              }}
              onFlingAway={() => {
                console.log("InteractionWeb: onFlingAway called, closing tab");
                closeTab();
              }}
              onDragComplete={() => {
                console.log(
                  "InteractionWeb: onDragComplete called, showing little sun",
                );
                setIsShowLittleSun(true);
              }}
              onSetSessionLimit={setSessionLimit}
            />
          </div>
        </div>
      )}

      {getIsShowBlackScreen() && <div id="minded-6622-black-screen"></div>}
    </>
  );
};

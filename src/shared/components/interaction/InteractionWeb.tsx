/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { fadeOut } from "@src/util/animation";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
// @ts-ignore
import { closeTabOrApp } from "@dataInterface/system";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { androidInterface } from "@src/dataInterface/android/system";

const ADVICE = getRndEntry(ACTION_ADVICES);
// NOTE: val also needs to be set in css

export const InteractionWeb: (props: {
  host: string;
  onHideAll: () => void;
}) => JSX.Element = (props) => {
  // const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);

  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getLittleSunTxt, setLittleSunTxt] = createSignal<string>("");

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

    // NOTE: timeout makes this much more reliable
    setTimeout(() => {
      initFadeOut();
    }, 100);
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  // TODO move as optional param to child

  const initFadeOut = () => {
    // if (getMode() === "ACTION_ADVICE") {
    //   setTimeout(() => {
    //     // prevent weird state when opening and directly switching to a new tab
    //     // TODO FIX
    //     // if (!document.hidden) {
    //     //   showSuccessSunAniFlow();
    //     // } else {
    //     //   window.addEventListener(
    //     //     "visibilitychange",
    //     //     () => {
    //     //       showSuccessSunAniFlow();
    //     //     },
    //     //     { once: true },
    //     //   );
    //     // }
    //     const res = fadeOut(wrapperEl, 5000, 2000);
    //     frameNr = res.frameNr;
    //     res.promise.then(() => {
    //       if (wrapperEl.style.opacity < 0.1) {
    //         littleSun();
    //       }
    //     });
    //   }, 5000);
    // } else {
    //   const res = fadeOut(wrapperEl, 5000, 2000);
    //   frameNr = res.frameNr;
    //   res.promise.then(() => {
    //     if (wrapperEl.style.opacity < 0.1) {
    //       littleSun();
    //     }
    //   });
    // }
  };

  const onSuccessSunTap = () => {
    setWasAnswerGiven(true);
    setIsShowLittleSun(true);
  };

  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const fadeOutMainFinal = () => {
    if (wrapperEl) {
      fadeOut(wrapperEl, 150).promise.then(() => {
        setIsShowLittleSun(true);
      });
    } else {
      setIsShowLittleSun(true);
    }
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOutMainFinal();
    }
  };

  // const updateQuestion = () => {
  //   setMode("QUESTION");
  //   if (syncData) {
  //     const rndQuestion =
  //       questionUpdateCount >= 5
  //         ? getRndEntry(QUESTIONS)
  //         : getQuestionSmart(syncData.answers);
  //
  //     if (questionIdBefore === rndQuestion.id) {
  //       questionUpdateCount++;
  //       updateQuestion();
  //     } else {
  //       questionIdBefore = rndQuestion.id;
  //       setRndQuestion(rndQuestion);
  //       // TODO implement
  //       // setLittleSunTxt(rndQuestion.t + "?");
  //       // setWasAnswerGiven(false);
  //       questionUpdateCount++;
  //     }
  //   }
  // };

  return (
    <>
      {getIsShowLittleSun() ? (
        <LittleSunComponent
          host={props.host}
          wasAnswerGiven={getWasAnswerGiven()}
          bubbleTxt={getLittleSunTxt()}
          teardown={teardown}
          onShowFreshQuestion={() => {
            // updateQuestion();
            setIsShowLittleSun(false);
            initFadeOut();
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
              fadeOutMainFinal();
            }
          }}
          ref={wrapperEl}
        >
          <InteractionCommon
            wrapperEl={wrapperEl}
            onModeSet={(mode) => undefined}
            onUpdateLittleSunTxt={setLittleSunTxt}
            onAfterSuccessSunFadeout={fadeOutMainFinal}
            onSuccessSunTap={onSuccessSunTap}
            onSkip={teardown}
            onUpdateQuestion={(question) => {
              setLittleSunTxt(question.t);
            }}
          />
        </div>
      )}
    </>
  );
};

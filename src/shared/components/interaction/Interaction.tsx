/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { RatingInteraction } from '@src/shared/components/interaction/RatingInteraction';
import { Question } from '@src/shared/components/interaction/Question';
import { getRndInt } from '@src/util/getRndInt';

const isShowRating = getRndInt(0, 10) === 0;


export const Interaction: (props: {
  onHideAll: () => void
}) => JSX.Element = (props) => {
  const [getIsShowSun, setIsShowSun] = createSignal(false);
  let wrapperEl;
  let frameNr;

  onMount(async () => {
    const res = fadeOut(wrapperEl, 5000, 2000);
    // const res = changeHeight(wrapperEl, 300,1000, 2000);
    frameNr = res.frameNr;
    res.promise.then(() => {
      if(wrapperEl.style.opacity < 0.1) {
        teardown();
      }
    });
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  const onSuccess = async () => {
    setIsShowSun(true);
    // wait for sun
    await promiseTimeout(800);
    await fadeOut(wrapperEl, 800).promise;
    teardown();
  };

  const cancelCountdown = () => {
    if(!frameNr) {
      return;
    }
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.transition = `opacity 1000ms ease-out`;
    wrapperEl.style.opacity = "1";
  };

  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    props.onHideAll();
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if(ev.key === "Escape") {
      teardown();
    }
  };

  return (
    <>
      <div
        id="minded-6622-coloured-wrapper"
        onclick={(ev) => {
          if(
            (ev.target as HTMLElement)?.id === "minded-6622-coloured-wrapper"
          ) {
            fadeOut(wrapperEl, 150).promise.then(() => {
              teardown();
            });
          }
        }}
        ref={wrapperEl}
      >
        {getIsShowSun() && <div id="minded-6622-sun"></div>}

        {isShowRating
          ? (<RatingInteraction onCancelCountdown={cancelCountdown}
                                onSuccess={onSuccess}
                                onCancel={teardown} />)
          : (<Question onCancelCountdown={cancelCountdown}
                       onSuccess={onSuccess}
                       onCancel={teardown} />)
        }
      </div>
    </>
  );
};

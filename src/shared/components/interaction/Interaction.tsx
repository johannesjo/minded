/* @refresh reload */
import { createSignal, JSX, Match, onCleanup, onMount, Switch } from "solid-js";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { getRndInt } from '@src/util/getRndInt';
import { RatingInteraction } from '@src/shared/components/interaction/RatingInteraction';
import { Question } from '@src/shared/components/interaction/Question';
import { getRndEntry } from '@src/util/getRndEntry';
import { ACTION_ADVICES } from '@src/shared/data/actionAdvices';


const MODE: 'RATING' | 'ACTION_ADVICE' | undefined = (() => {
  // return 'ACTION_ADVICE';
  const rndInt = getRndInt(0, 100);
  if(rndInt > 90) {
    return 'RATING';
  }
  if(rndInt > 80) {
    return 'ACTION_ADVICE';
  }
  return undefined;
})();
const ADVICE = getRndEntry(ACTION_ADVICES);

export const Interaction: (props: {
  onHideAll: () => void
}) => JSX.Element = (props) => {
  const [getIsShowSun, setIsShowSun] = createSignal(false);
  let wrapperEl;
  let frameNr;

  onMount(async () => {
    // NOTE: timeout makes this much more reliable
    setTimeout(() => {
      initFadeOut();
    }, 100);
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  const initFadeOut = () => {
    const res = fadeOut(wrapperEl, 5000, 2000);
    // const res = changeHeight(wrapperEl, 300,1000, 2000);
    frameNr = res.frameNr;
    res.promise.then(() => {
      if(wrapperEl.style.opacity < 0.1) {
        teardown();
      }
    });
  };

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
        <Switch>
          <Match when={(MODE === 'ACTION_ADVICE') as any}>
            <div id="minded-6622-action-advice">
              <div>{ADVICE.txt}</div>
              <div>{ADVICE.ico}</div>
            </div>
          </Match>
          <Match when={(MODE === 'RATING') as any}>
            <RatingInteraction onCancelCountdown={cancelCountdown}
                               onSuccess={onSuccess}
                               onCancel={teardown} />
          </Match>
          <Match when={(!MODE) as any}>
            <Question onCancelCountdown={cancelCountdown}
                      onSuccess={onSuccess}
                      onCancel={teardown} />
          </Match>
        </Switch>
      </div>
    </>
  );
};

/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { QUESTIONS } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/sync-data";
import { saveAnswer } from "@src/shared/data/dataInterface";
import { fadeOut, promiseTimeout } from "@src/util/animation";
import { getRndEntry } from "@src/util/getRndEntry";

// once on app load
const rndQuestion = getRndEntry(QUESTIONS);

export const Question: (props: {
  isUnskippable?: boolean;
  onHide: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  const [getIsShowSun, setIsShowSun] = createSignal(false);
  let wrapperEl;
  let inpEl;
  let frameNr;

  onMount(async () => {
    if(!props.isUnskippable) {
      const res = fadeOut(wrapperEl, 5000, 2000);
      // const res = changeHeight(wrapperEl, 300,1000, 2000);
      frameNr = res.frameNr;
      res.promise.then(() => {
        if(wrapperEl.style.opacity < 0.1) {
          teardown();
        }
      });
    }

    inpEl.focus();
    setTimeout(() => inpEl.focus(), 250);

    if(rndQuestion.prompt) {
      inpEl.value = rndQuestion.prompt + " ";
    }
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  const returnToInp = async (ev) => {
    if(!frameNr) {
      return;
    }
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.transition = `opacity 1000ms ease-out`;
    wrapperEl.style.opacity = "1";
  };

  const teardown = (isSubmitSuccess: boolean = false) => {
    if(!props.isUnskippable || isSubmitSuccess) {
      console.log('ON HIDEEee');

      props.onHide();
    }
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if(ev.key === "Escape") {
      teardown();
    }
  };

  const submitAnswer = async (answer: Answer) => {
    if(!answer.val || answer.val.length < 2) {
      return;
    }
    setIsInputDisabled(true);
    setIsShowSun(true);
    await saveAnswer(answer);
    // wait for sun
    await promiseTimeout(800);
    await fadeOut(wrapperEl, 800).promise;
    teardown(true);
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if(ev.key === "Enter") {
      submitAnswer({
        questionCategoryId: rndQuestion.categoryId,
        val: (ev.target as any).value,
        ts: Date.now(),
      });
    } else if(ev.key === "Escape") {
      teardown();
    } else if(ev.key !== "Control") {
      returnToInp(ev);
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
        <div id="minded-6622-msg">
          <div id="minded-6622-question">{rndQuestion.t}?</div>
          <input
            ref={inpEl}
            type="text"
            disabled={getIsInputDisabled()}
            onkeypress={() => undefined}
            onmouseenter={returnToInp}
            onclick={returnToInp}
            onkeydown={onKeyDown}
            maxlength={500}
            id="minded-6622-inp"
            autoFocus
          />
        </div>
      </div>
    </>
  );
};

/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { Questions } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/sync-data";
import { saveAnswer } from "@src/shared/data/dataInterface";
import { fadeOut } from "@src/util/animation";

// once on app load
const rndQuestion = Questions[Math.floor(Math.random() * Questions.length)];

export const Question: (props: {
  isUnskippable?: boolean;
  onHide: () => void;
}) => JSX.Element = (props) => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  let wrapperEl;
  let inpEl;
  let frameNr;

  onMount(async () => {
    if (!props.isUnskippable) {
      const res = fadeOut(wrapperEl, 2000, 1500);
      frameNr = res.frameNr;
    }

    inpEl.focus();
    setTimeout(() => inpEl.focus(), 250);

    if (rndQuestion.prompt) {
      inpEl.value = rndQuestion.prompt + " ";
    }
  });

  onCleanup(() => {
    document.removeEventListener("keypress", escapeHandler);
  });

  const returnToInp = async (ev) => {
    if (!frameNr) {
      return;
    }
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.opacity = "1";
    wrapperEl.style.transition = `opacity 300ms ease-out`;
  };

  const teardown = (isSubmitSuccess: boolean = false) => {
    if (!props.isUnskippable || isSubmitSuccess) {
      props.onHide();
    }
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      teardown();
    }
  };

  const submitAnswer = async (answer: Answer) => {
    if (!answer.val || answer.val.length < 2) {
      return;
    }
    setIsInputDisabled(true);
    await saveAnswer(answer);
    await fadeOut(wrapperEl, 500).promise;
    teardown(true);
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === "Enter") {
      submitAnswer({
        questionCategoryId: rndQuestion.categoryId,
        val: (ev.target as any).value,
        ts: Date.now(),
      });
    } else if (ev.key === "Escape") {
      teardown();
    } else if (ev.key !== "Control") {
      returnToInp(ev);
    }
  };

  return (
    <>
      <div
        id="minded-6622-coloured-wrapper"
        onclick={(ev) => {
          if (
            (ev.target as HTMLElement)?.id === "minded-6622-coloured-wrapper"
          ) {
            // TODO remove later
            teardown();
          }
        }}
        ref={wrapperEl}
      >
        <div id="minded-6622-msg">
          <div id="minded-6622-question">{rndQuestion.t}?</div>
          <input
            ref={inpEl}
            type="text"
            disabled={getIsInputDisabled()}
            onkeypress={() => undefined}
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

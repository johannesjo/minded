/* @refresh reload */
import { createSignal, JSX } from "solid-js";
import { QUESTIONS } from "@src/data/questions";
import { Answer } from "@src/data/sync-data";
import { saveAnswer } from "@src/data/dataInterface";

// once on app load
const rndQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

export const MindedQuestion: () => JSX.Element = () => {
  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      teardown();
    }
  };
  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    // wrapperEl?.remove();
  };

  const submitAnswer = async (answer: Answer) => {
    if (!answer.val || answer.val.length < 2) {
      return;
    }
    setIsInputDisabled(true);

    await saveAnswer(answer);
    // await fadeOut(wrapperEl, 500).promise;
    teardown();
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === "Enter") {
      submitAnswer({
        questionId: rndQuestion.category,
        val: (ev.target as any).value,
        ts: Date.now(),
      });
    } else if (ev.key !== "Control") {
      // returnToInp(ev);
    }
  };

  return (
    <>
      <div id="minded-6622-coloured-wrapper">
        <div id="minded-6622-msg">
          <div id="minded-6622-question">{rndQuestion.txt}?</div>
          <input
            type="text"
            disabled={getIsInputDisabled()}
            onkeypress={() => undefined}
            onclick={() => undefined}
            onkeydown={onKeyDown}
            id="minded-6622-inp"
            autoFocus
          />
        </div>
      </div>
    </>
  );
};

// async function init() {
//   // const returnToInp = async (ev) => {
//   //   window.cancelAnimationFrame(frameNr);
//   //   // wrapperEl.style.opacity = "1";
//   //   // wrapperEl.style.transition = `opacity 300ms ease-out`;
//   // };
//   //
//   //
//   // const inp = document.getElementById('minded-6622-inp');
//   // inp.focus();
//   // setTimeout(() => inp.focus(), 250);
//   //
//   // // Remove on background click
//   // // wrapperEl.onclick = (ev) => {
//   // //   if((ev.target as HTMLElement)?.id === 'minded-6622') {
//   // //     teardown();
//   // //   }
//   // // };
//   // inp.addEventListener('click', returnToInp);
//   // document.addEventListener('keydown', escapeHandler);
//   // const {frameNr} = fadeOut(wrapperEl, 2000, 1500);
// }

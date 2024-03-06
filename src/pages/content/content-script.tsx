/* @refresh reload */
// @ts-ignore
import { isOnBlockedUrl } from "@src/util/isOnBlockedUrl";
import { getSyncData } from "@src/shared/data/dataInterface";
import { ContentScriptMain } from "@src/pages/content/ContentScriptMain";
// @ts-ignore
import styleAsString from "./content-script.scss?inline";
import { render } from "solid-js/web";

const CURRENT_URL = window.location.href;

(function init() {
  getSyncData().then((syncData) => {
    // console.log('isOnBlocked', isOnBlockedUrl(CURRENT_URL, syncData), syncData);
    if (isOnBlockedUrl(CURRENT_URL, syncData)) {
      async function innerInit() {
        if (!document.body) {
          self.setTimeout(() => {
            innerInit();
          }, 100);
          return;
        }

        // If we ever decide to go back to 2 files
        // const src = bro.runtime.getURL("js/content-script-inner.js");
        // const contentMain = await import(src);
        // console.log(contentMain);

        const wrapperEl = document.createElement("div");
        wrapperEl.id = "minded-6622";
        document.body.appendChild(wrapperEl);
        const styleTag = document.createElement("style");
        styleTag.textContent = styleAsString;
        document.head.appendChild(styleTag);
        console.log(render);

        render(() => (<ContentScriptMain />) as any, wrapperEl);
      }

      innerInit();
    }
  });
})();

//
//
// // @ts-ignore
// import styleAsString from "./content-script.scss?inline";
// import { fadeOut } from '@src/util/animation';
// import { QUESTION_FOR_PROMPT } from '@src/data/questions';
// import { isOnBlockedUrl } from '@src/util/isOnBlockedUrl';
// import { getSyncData, saveAnswer } from '@src/data/dataInterface';
// import { Answer } from '@src/data/sync-data';
//
//
//
// const CURRENT_URL = window.location.href;
//
// async function init() {
//   const syncData = await getSyncData();
//   console.log(syncData);
//
//   if(!isOnBlockedUrl(CURRENT_URL, syncData)) {
//     return;
//   }
//
//   if(!document.body) {
//     self.setTimeout(() => {
//       init();
//     }, 100);
//     return;
//   }
//
//   const escapeHandler = (ev: KeyboardEvent) => {
//     if(ev.key === 'Escape') {
//       teardown();
//     }
//   };
//
//   const teardown = () => {
//     document.removeEventListener('keypress', escapeHandler);
//     wrapperEl?.remove();
//   };
//
//   const submitAnswer = async (answer: Answer) => {
//     if(!answer.val || answer.val.length < 2) {
//       return;
//     }
//
//     await saveAnswer(answer);
//     await fadeOut(wrapperEl, 500).promise;
//     teardown();
//   };
//
//   const returnToInp = async (ev) => {
//     window.cancelAnimationFrame(frameNr);
//     wrapperEl.style.opacity = "1";
//     wrapperEl.style.transition = `opacity 300ms ease-out`;
//   };
//
//   // Load styles
//   const styleTag = document.createElement("style");
//   styleTag.textContent = styleAsString;
//   document.head.appendChild(styleTag);
//
//   // Create Element
//   const wrapperEl = document.createElement("div");
//   wrapperEl.id = "minded-6622";
//   document.body.appendChild(wrapperEl);
//
//
//   const rndQuestion = QUESTION_FOR_PROMPT[Math.floor(Math.random() * QUESTION_FOR_PROMPT.length)];
//   wrapperEl.innerHTML = `<div id="minded-6622-msg">
// <div id="minded-6622-question">${rndQuestion.txt}?</div>
// <input type="text" id="minded-6622-inp" autofocus />
// </div>`;
//
//
//   const inp = document.getElementById('minded-6622-inp');
//   inp.focus();
//   setTimeout(() => inp.focus(), 250);
//
//   // Remove on background click
//   wrapperEl.onclick = (ev) => {
//     if((ev.target as HTMLElement)?.id === 'minded-6622') {
//       teardown();
//     }
//   };
//
//   inp.addEventListener('keydown', (ev) => {
//     console.log(ev);
//     console.log((ev as any).target.value);
//     console.log(ev.key);
//
//
//     if(ev.key === 'Enter') {
//       submitAnswer({
//         questionCategoryId: rndQuestion.category,
//         val: (ev.target as any).value,
//         ts: Date.now(),
//       });
//     } else if(ev.key !== 'Control') {
//       returnToInp(ev);
//     }
//   });
//   inp.addEventListener('click', returnToInp);
//
//
//   document.addEventListener('keydown', escapeHandler);
//
//
//   const {frameNr} = fadeOut(wrapperEl, 2000, 1500);
// }
//
//
// init();

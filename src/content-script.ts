// @ts-ignore
import styleAsString from "./content-script.css?inline";
import { fadeOut } from '@src/util/animation';
import { QUESTIONS } from '@src/data/questions';
import { isOnBlockedUrl } from '@src/util/isOnBlockedUrl';
import { getSyncData, saveAnswer } from '@src/data/dataInterface';
import { Answer } from '@src/data/sync-data';


const CURRENT_URL = window.location.href;

async function init() {
  const syncData = await getSyncData();
  console.log(syncData);

  if(!isOnBlockedUrl(CURRENT_URL, syncData)) {
    return;
  }

  if(!document.body) {
    self.setTimeout(() => {
      init();
    }, 100);
    return;
  }

  const escapeHandler = (ev: KeyboardEvent) => {
    if(ev.key === 'Escape') {
      teardown();
    }
  };

  const teardown = () => {
    document.removeEventListener('keypress', escapeHandler);
    wrapperEl?.remove();
  };

  const submitAnswer = async (answer: Answer) => {
    if(!answer.val || answer.val.length < 2) {
      return;
    }

    await saveAnswer(answer);
    await fadeOut(wrapperEl, 500).promise;
    teardown();
  };

  const returnToInp = async (ev) => {
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.opacity = "1";
    wrapperEl.style.transition = `opacity 300ms ease-out`;
  };

  // Load styles
  const styleTag = document.createElement("style");
  styleTag.textContent = styleAsString;
  document.head.appendChild(styleTag);

  // Create Element
  const wrapperEl = document.createElement("div");
  wrapperEl.id = "minded-6622";
  document.body.appendChild(wrapperEl);


  const rndQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  wrapperEl.innerHTML = `<div id="minded-6622-msg">
<div id="minded-6622-question">${rndQuestion.txt}?</div>
<input type="text" id="minded-6622-inp" autofocus />
</div>`;


  const inp = document.getElementById('minded-6622-inp');
  inp.focus();
  setTimeout(() => inp.focus(), 250);

  // Remove on background click
  wrapperEl.onclick = (ev) => {
    if((ev.target as HTMLElement)?.id === 'minded-6622') {
      teardown();
    }
  };

  inp.addEventListener('keydown', (ev) => {
    console.log(ev);
    console.log((ev as any).target.value);
    console.log(ev.key);


    if(ev.key === 'Enter') {
      submitAnswer({
        questionId: rndQuestion.category,
        val: (ev.target as any).value,
        ts: Date.now(),
      });
    } else if(ev.key !== 'Control') {
      returnToInp(ev);
    }
  });
  inp.addEventListener('click', returnToInp);


  document.addEventListener('keydown', escapeHandler);


  const {frameNr} = fadeOut(wrapperEl, 2000, 1500);
}


init();

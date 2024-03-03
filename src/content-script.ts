// @ts-ignore
import styleAsString from "./content-script.css?inline";
import { fadeOut } from '@src/util/animation';
import { QUESTIONS } from '@src/questions';
import { isOnBlockedUrl } from '@src/util/isOnBlockedUrl';
import { getCfgSync } from '@src/util/getCfgSync';


const CURRENT_URL = window.location.href;
async function init() {
  const cfg = await getCfgSync();
  console.log(cfg);

  if(!isOnBlockedUrl(CURRENT_URL, cfg)) {
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

  const returnToInp = async (ev) => {
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.opacity = "1";
    wrapperEl.style.transition = `opacity 300ms ease-out`;
    if(ev.key === 'Enter') {
      await fadeOut(wrapperEl, 500).promise;
      teardown();
    }
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

  inp.addEventListener('keydown', returnToInp);
  inp.addEventListener('click', returnToInp);


  document.addEventListener('keydown', escapeHandler);


  const {frameNr} = fadeOut(wrapperEl, 2000, 1500);
}


init();

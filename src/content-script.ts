// @ts-ignore
import styleAsString from "./content-script.css?inline";
import { fadeOut, promiseTimeout } from '@src/util/animation';
import { QUESTIONS } from '@src/questions';




async function init() {
  if(!document.body) {
    self.setTimeout(() => {
      init();
    }, 100);
    return;
  }

  pauseAllRunningVideos();
  // Load styles
  const styleTag = document.createElement("style");
  styleTag.textContent = styleAsString;
  document.head.appendChild(styleTag);
  // Create Element
  const wrapperEl = document.createElement("div");
  wrapperEl.id = "minded-6622";
  document.body.appendChild(wrapperEl);
  wrapperEl.onclick = () => wrapperEl.remove();
  const rndQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  wrapperEl.innerHTML = `<div id="minded-6622-msg">
<div id="minded-6622-question">${rndQuestion.txt}?</div>
<input type="text" id="minded-6622-inp" autofocus />
</div>`;

  const inp = document.getElementById('minded-6622-inp');

  console.log(inp);


  await promiseTimeout(2000);
  const {frameNr, promise} = fadeOut(wrapperEl, 3000);

  inp.addEventListener('keydown', (ev) => {
    window.cancelAnimationFrame(frameNr);
    wrapperEl.style.opacity = "1";
    // wrapperEl.style.transition = ``;
    console.log(ev.key);

    if(ev.key === 'Enter') {
      fadeOut(wrapperEl, 500);
    }
  });
}

function pauseAllRunningVideos(): void {
  document.querySelectorAll("video").forEach((vid) => vid.pause());
}

init();

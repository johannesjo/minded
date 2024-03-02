// @ts-ignore
import styleAsString from "./content-script.css?inline";



function init() {
  if (!document.body) {
    self.setTimeout(()=>{
      init();
    }, 100)
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
  wrapperEl.onclick = ()=> wrapperEl.remove();
}

function pauseAllRunningVideos(): void {
  document.querySelectorAll("video").forEach((vid) => vid.pause());
}

// init();

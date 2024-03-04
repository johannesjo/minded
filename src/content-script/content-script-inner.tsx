// /* @refresh reload */
// import { render } from 'solid-js/web';
// import styleAsString from "./content-script.scss?inline";
// import { MindedWrapper } from '@src/content-script/MindedWrapper';
//
// const wrapperEl = document.createElement("div");
// wrapperEl.id = "minded-6622";
// document.body.appendChild(wrapperEl);
//
// const styleTag = document.createElement("style");
// styleTag.textContent = styleAsString;
// document.head.appendChild(styleTag);
//
// function init() {
//   if(!document.body) {
//     self.setTimeout(() => {
//       init();
//     }, 100);
//     return;
//   }
//   render(() => <MindedWrapper /> as any, wrapperEl);
// }
//
// init();
//
//

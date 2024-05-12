import { render } from "solid-js/web";
import "./interactionWindow.scss";
// @ts-ignore
import InteractionWindow from "@src/android/interactionWindow/InteractionWindow.tsx";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(InteractionWindow as any, appContainer);

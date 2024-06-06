import { render } from "solid-js/web";
import "./interactionIOS.scss";
// @ts-ignore
import InteractionIOS from "@src/ios/interaction/InteractionIOS.tsx";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(InteractionIOS as any, appContainer);

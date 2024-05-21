import { render } from "solid-js/web";
import "./interactionAndroid.scss";
// @ts-ignore
import InteractionAndroid from "@src/android/interaction/InteractionAndroid.tsx";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(InteractionAndroid as any, appContainer);

import { render } from "solid-js/web";
import "./indexInteractionAndroid.scss";
// @ts-ignore
import InteractionAndroid from "@src/android/interaction/InteractionAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";

setupKeyboardScrolling();

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <InteractionAndroid />, appContainer);

import { render } from "solid-js/web";
import "./indexInteractionAndroid.scss";
// @ts-ignore
import InteractionAndroid from "@src/android/interaction/InteractionAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";
import { setupAndroidInsets } from "@src/dataInterface/android/setupAndroidInsets";

setupKeyboardScrolling();

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

setupAndroidInsets(appContainer as HTMLElement);
render(() => <InteractionAndroid />, appContainer);

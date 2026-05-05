import { render } from "solid-js/web";
import "@src/android/interaction/indexInteractionAndroid.scss";
import SleepWindDownAndroid from "./SleepWindDownAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";
import { setupAndroidInsets } from "@src/dataInterface/android/setupAndroidInsets";

setupKeyboardScrolling();

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

setupAndroidInsets(appContainer as HTMLElement);
render(() => <SleepWindDownAndroid />, appContainer);

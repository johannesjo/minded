window.IS_MAIN_MINDED_6622 = true;

import { render } from "solid-js/web";
import "./indexMainAndroid.scss";
// @ts-ignore
import MainAndroid from "@src/android/main/MainAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";
import { setupAndroidInsets } from "@src/dataInterface/android/setupAndroidInsets";

setupKeyboardScrolling();

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

setupAndroidInsets(appContainer as HTMLElement);
render(() => <MainAndroid />, appContainer);

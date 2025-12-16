window.IS_MAIN_MINDED_6622 = true;

import { render } from "solid-js/web";
import "./indexMainAndroid.scss";
// @ts-ignore
import MainAndroid from "@src/android/main/MainAndroid";
import { setupKeyboardScrolling } from "@src/dataInterface/android/setupKeyboardScrolling";

setupKeyboardScrolling();

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <MainAndroid />, appContainer);

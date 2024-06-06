(window as any).IS_MAIN_MINDED_6622 = true;

import { render } from "solid-js/web";
import "./mainAndroid.scss";
// @ts-ignore
import MainAndroid from "@src/android/main/MainAndroid";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <MainAndroid />, appContainer);

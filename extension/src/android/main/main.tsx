import { render } from "solid-js/web";
import "./main.scss";
import MainAndroid from "@src/android/main/MainAndroid";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <MainAndroid />, appContainer);

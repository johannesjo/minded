import { render } from "solid-js/web";
import "./main.scss";
// @ts-ignore
import Main from "@src/android/main/Main.tsx";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(Main as any, appContainer);

import { render } from "solid-js/web";
import "./settings.scss";
// @ts-ignore
import Settings from "@src/android/settings/Settings.tsx";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(Settings as any, appContainer);

import { render } from "solid-js/web";
import "./popup.scss";
import Popup from "./Popup";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <Popup />, appContainer);

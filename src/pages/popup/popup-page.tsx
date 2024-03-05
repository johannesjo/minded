import { render } from "solid-js/web";
import "./popup.scss";
import Popup from "./Popup";

const appContainer = document.querySelector("#app-container");
if(!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(Popup as any, appContainer);

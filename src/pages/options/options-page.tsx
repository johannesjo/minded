import { render } from "solid-js/web";
import "./options-page.scss";
import Option from "./Options";

const appContainer = document.querySelector("#app-container");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(Option, appContainer);

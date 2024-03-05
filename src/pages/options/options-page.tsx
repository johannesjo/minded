import { render } from "solid-js/web";
import "./options-page.scss";
import Option from "./Options";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(Option as any, appContainer);

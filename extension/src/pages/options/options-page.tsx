import { render } from "solid-js/web";
import "./options-page.scss";
import OptionsPage from "@pages/options/OptionsPage";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <OptionsPage />, appContainer);

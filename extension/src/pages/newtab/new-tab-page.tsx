window.IS_MAIN_MINDED_6622 = true;

import { render } from "solid-js/web";
import "./new-tab-page.scss";
import NewTab from "./NewTab";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

render(() => <NewTab />, appContainer);

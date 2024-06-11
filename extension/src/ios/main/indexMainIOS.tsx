import { setupUpdateInsets } from "@src/ios/shared/setupUpdateInsets";

(window as any).IS_MAIN_MINDED_6622 = true;

import { render } from "solid-js/web";
import "./indexMainIOS.scss";
// @ts-ignore
import MainIOS from "@src/ios/main/MainIOS";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}
setupUpdateInsets(appContainer as HTMLElement);
render(() => <MainIOS />, appContainer);

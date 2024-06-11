import { render } from "solid-js/web";
import "./indexInteractionIOS.scss";
// @ts-ignore
import InteractionIOS from "@src/ios/interaction/InteractionIOS.tsx";
import { setupUpdateInsets } from "@src/ios/shared/setupUpdateInsets";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

setupUpdateInsets(appContainer as HTMLElement);

render(InteractionIOS as any, appContainer);

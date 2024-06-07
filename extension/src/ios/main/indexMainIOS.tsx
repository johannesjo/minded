(window as any).IS_MAIN_MINDED_6622 = true;
import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";

import { render } from "solid-js/web";
import "./indexMainIOS.scss";
// @ts-ignore
import MainIOS from "@src/ios/main/MainIOS";

const appContainer = document.querySelector("#minded-6622");
if (!appContainer) {
  throw new Error("Can not find AppContainer");
}

SafeArea.getSafeAreaInsets().then((data) => {
  updateInsets(data);
});
SafeArea.addListener("safeAreaChanged", (data) => {
  updateInsets(data);
});

const updateInsets = (data: SafeAreaInsets) => {
  const { insets } = data;
  console.log(data);

  for (const [key, value] of Object.entries(insets)) {
    (appContainer as HTMLElement).style.setProperty(
      `--safe-area-inset-${key}`,
      `${value}px`,
    );
  }
};

render(() => <MainIOS />, appContainer);

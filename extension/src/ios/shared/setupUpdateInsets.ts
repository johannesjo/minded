import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";
import { Keyboard } from "@capacitor/keyboard";

export const setupUpdateInsets = (appEl: HTMLElement) => {
  Keyboard.addListener("keyboardWillShow", (info) => {
    appEl.style.setProperty(
      `--app-height`,
      `calc(100% - ${info.keyboardHeight}px)`,
    );
  });

  Keyboard.addListener("keyboardWillHide", () => {
    appEl.style.setProperty(`--app-height`, `100%`);
  });

  SafeArea.getSafeAreaInsets().then((data) => {
    updateInsets(data);
  });
  SafeArea.addListener("safeAreaChanged", (data) => {
    updateInsets(data);
  });

  const updateInsets = (data: SafeAreaInsets) => {
    const { insets } = data;

    for (const [key, value] of Object.entries(insets)) {
      appEl.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
    }
  };
};

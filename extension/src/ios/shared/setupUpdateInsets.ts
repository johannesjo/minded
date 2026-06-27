import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";
import { Keyboard } from "@capacitor/keyboard";
import { SAFE_AREA_INSETS_CHANGED_EV } from "@src/ev.const";

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

    // The CSS vars are now live, so any JS layout derived from an inset can
    // re-read them. Mirrors Android's native `androidSafeAreaChanged` so the
    // shell sun's bottom-bar anchor re-syncs instead of drifting from the
    // CSS-driven bar by the inset amount (see SAFE_AREA_INSETS_CHANGED_EV).
    window.dispatchEvent(new Event(SAFE_AREA_INSETS_CHANGED_EV));
  };
};

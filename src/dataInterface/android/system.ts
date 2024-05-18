import { androidInterface } from "@src/dataInterface/android/androidInterface";

export const requestFocusAndShowKeyboard = () => {
  androidInterface.requestFocusAndShowKeyboard();
};

// TODO make more robust
export const goSettings = (): void => {
  window.location.href = window.location.href.replace(
    "main/index.html",
    "settings/index.html",
  );
};

export const goMain = (): void => {
  window.location.href = window.location.href.replace(
    "settings/index.html",
    "main/index.html",
  );
};

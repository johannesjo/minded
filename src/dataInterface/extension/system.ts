import { bro } from "@src/util/browser";

export const closeTab = () => {
  bro.runtime.sendMessage({ closeTab: true });
};
export const requestFocusAndShowKeyboard = () => {
  // stub for web
};

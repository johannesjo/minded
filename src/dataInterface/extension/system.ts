import { bro } from "@src/util/browser";

export const closeTabOrApp = () => {
  bro.runtime.sendMessage({ closeTab: true });
};

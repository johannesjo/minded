import { bro } from "@src/util/browser";
// @ts-ignore
import { countBlockedAttempt } from "@dataInterface/syncDataInterface.ts";

bro.action.onClicked.addListener(function () {
  bro.tabs.create({
    url: bro.runtime.getURL("src/pages/newtab/index.html"),
  });
});
bro.runtime.onInstalled.addListener(() => {
  bro.tabs.create({
    url: bro.runtime.getURL("src/pages/newtab/index.html"),
  });
});

bro.runtime.onMessage.addListener((request, sender) => {
  if (request.closeTab) {
    countBlockedAttempt();
    bro.tabs.remove(sender.tab.id);
  }
});

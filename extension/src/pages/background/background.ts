import { bro } from "@src/util/browser";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { countBlockedAttempt } from "@src/dataInterface/extension/syncDataInterface.ts";

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

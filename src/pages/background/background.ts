import { bro } from "@src/util/browser";
import { countBlockedAttempt } from "@src/shared/data/dataInterface";

bro.action.onClicked.addListener(function (tab) {
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

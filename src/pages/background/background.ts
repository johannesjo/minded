import { bro } from "@src/util/browser";

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
    bro.tabs.remove(sender.tab.id);
  }
});

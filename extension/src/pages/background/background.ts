import { bro } from "@src/util/browser";
import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";

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
  if (request.closeTab && sender.tab?.id) {
    countSunTap();
    bro.tabs.remove(sender.tab.id);
  }
});

import { bro } from "@src/util/browser";
import {
  countSunTap,
  getSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { formatBadgeTime } from "@src/util/formatTime";
import { SyncData } from "@src/dataInterface/syncData";

let badgeInterval: ReturnType<typeof setInterval> | null = null;

type ActiveTimer = SyncData["activeTimer"];

function updateBadge(timer: ActiveTimer) {
  if (badgeInterval) {
    clearInterval(badgeInterval);
    badgeInterval = null;
  }

  if (!timer) {
    bro.action.setBadgeText({ text: "" });
    return;
  }

  const isRestOfDay = timer.durationS === -1;

  // Rest-of-day mode: no badge (unlimited time)
  if (isRestOfDay) {
    bro.action.setBadgeText({ text: "" });
    return;
  }

  const tick = () => {
    const now = Date.now();

    if (timer.endTS <= now) {
      bro.action.setBadgeText({ text: "" });
      if (badgeInterval) {
        clearInterval(badgeInterval);
        badgeInterval = null;
      }
      return;
    }

    const seconds = Math.max(Math.floor((timer.endTS - now) / 1000), 0);
    const text = formatBadgeTime(seconds);
    bro.action.setBadgeText({ text });
    bro.action.setBadgeBackgroundColor({ color: "#E8A03E" });
  };

  tick();
  badgeInterval = setInterval(tick, 1000);
}

// Listen for timer changes in storage
bro.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.activeTimer) {
    updateBadge(changes.activeTimer.newValue as ActiveTimer);
  }
});

// Initialize badge on startup
getSyncData().then((syncData) => {
  if (syncData.activeTimer) {
    updateBadge(syncData.activeTimer);
  }
});

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

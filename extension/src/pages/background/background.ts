import { bro } from "@src/util/browser";
import {
  getSyncData,
  patchSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { formatBadgeTime } from "@src/util/formatTime";
import { SyncData } from "@src/dataInterface/syncData";
import { updateSyncDataField } from "@src/dataInterface/updateSyncDataHelpers";
import { isAddUsageTimeMessage } from "@src/dataInterface/extension/extensionMessages";
import { addUsageTime } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageStats";

let badgeInterval: ReturnType<typeof setInterval> | null = null;
let syncUpdateQueue: Promise<void> = Promise.resolve();

type ActiveTimer = SyncData["activeTimer"];

const enqueueSyncUpdate = (task: () => Promise<void>): Promise<void> => {
  const nextTask = syncUpdateQueue.then(task, task);
  syncUpdateQueue = nextTask.catch(() => undefined);
  return nextTask;
};

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
    // Deliberately NO countSunTap here: closeTab is the LEAVE path (fling,
    // drag-down, Little-Sun tap). Sun taps feed friction escalation and the
    // return-loop insight - counting leaves would punish exactly the choice
    // the sun invites, and Android's leave path counts nothing either. Taps
    // are counted on completed interactions only (onInteractionSubmitted).
    bro.tabs.remove(sender.tab.id);
    return undefined;
  }

  if (isAddUsageTimeMessage(request)) {
    return enqueueSyncUpdate(() =>
      updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
        usageStats: addUsageTime(
          syncData.usageStats,
          request.host,
          request.seconds,
        ),
      })),
    );
  }

  return undefined;
});

/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { InteractionWeb } from "@src/shared/components/interaction/InteractionWeb";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import {
  loadDataForHost,
  updateHostsEntry,
  // @ts-ignore
} from "@dataInterface/localDataInterface";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { updateSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { bro } from "@src/util/browser";
import { SyncData } from "@src/dataInterface/syncData";
import {
  getWebHostSessionTarget,
  isActiveTimerInScope,
} from "@src/util/activeTimerScope";

const RESET_WEBSITE_USAGE_DURATION_THRESHOLD = 30 * 60 * 1000;

export const ContentScriptMain: (props: {
  isShowFullMinderInitially: boolean;
  shadowRoot?: ShadowRoot;
  onTeardownShadow?: () => void;
}) => JSX.Element = (props) => {
  const host = getHostFromUrl(window.location.href);
  const [getIsShowFullMinder, setIsShowFullMinder] = createSignal(
    props.isShowFullMinderInitially,
  );

  // Use shadow-aware teardown if available, otherwise fall back to document query
  const teardown = () => {
    if (props.onTeardownShadow) {
      props.onTeardownShadow();
    } else {
      document.getElementById("minded-6622")?.remove();
    }
  };

  // Listen for activeTimer changes from other tabs
  const handleStorageChange = (
    changes: { [key: string]: { newValue?: unknown; oldValue?: unknown } },
    areaName: string,
  ) => {
    if (areaName !== "sync" || !("activeTimer" in changes)) return;

    const newTimer = changes.activeTimer.newValue as SyncData["activeTimer"];
    const oldTimer = changes.activeTimer.oldValue as SyncData["activeTimer"];
    const now = Date.now();
    const target = getWebHostSessionTarget(host);
    const isNewTimerActiveForHost =
      !!newTimer &&
      newTimer.endTS > now &&
      isActiveTimerInScope(newTimer, target, "web");
    const wasOldTimerForHost =
      !!oldTimer && isActiveTimerInScope(oldTimer, target, "web");

    if (isNewTimerActiveForHost) {
      // Timer was set (in this or another tab) → show LittleSun
      if (getIsShowFullMinder()) {
        setIsShowFullMinder(false);
      }
    } else if (wasOldTimerForHost && !getIsShowFullMinder()) {
      // Timer was cleared → show fresh intervention
      setIsShowFullMinder(true);
    }
  };

  onMount(async () => {
    addWrapperClasses(props.shadowRoot);

    // Register storage change listener for cross-tab sync
    bro.storage.onChanged.addListener(handleStorageChange);

    if (props.isShowFullMinderInitially) {
      setTimeout(() => {
        updateSyncData({
          lastBlockedTS: Date.now(),
          lastBlockedUrl: window.location.href,
        });
      }, 8000);
    }

    const dataForHost = await loadDataForHost(host);
    const now = Date.now();

    if (
      dataForHost &&
      now - RESET_WEBSITE_USAGE_DURATION_THRESHOLD > dataForHost.lastUsedTS
    ) {
      updateHostsEntry(host, {
        lastUsedTS: now,
        sessionDurationInS: 0,
      });
    } else {
      updateHostsEntry(host, { lastUsedTS: now });
    }
  });

  onCleanup(() => {
    bro.storage.onChanged.removeListener(handleStorageChange);
  });

  return (
    <>
      {getIsShowFullMinder() ? (
        <InteractionWeb
          host={host}
          onHideAll={teardown}
          shadowRoot={props.shadowRoot}
        />
      ) : (
        <LittleSunComponent
          host={host}
          onShowFreshInteraction={() => setIsShowFullMinder(true)}
          teardown={teardown}
        ></LittleSunComponent>
      )}
    </>
  );
};

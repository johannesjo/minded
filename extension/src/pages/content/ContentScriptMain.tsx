/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
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

  onMount(async () => {
    addWrapperClasses(props.shadowRoot);

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
        sessionEndTS: null,
        sessionLimitInS: null,
      });
    } else {
      updateHostsEntry(host, { lastUsedTS: now });
    }

    // If user already selected a conscious intent window that hasn't expired, stay in Little Sun mode
    if (dataForHost?.sessionEndTS) {
      if (now >= dataForHost.sessionEndTS) {
        // Expired window: reset timing fields so we show the full intervention again
        updateHostsEntry(host, { sessionEndTS: null, sessionLimitInS: null });
      } else {
        setIsShowFullMinder(false);
      }
    }
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

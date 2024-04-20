/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { updateSyncData } from "@src/shared/data/syncDataInterface";
import { Interaction } from "@src/shared/components/interaction/Interaction";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import {
  loadDataForHost,
  updateHostsEntry,
} from "@src/shared/data/localDataInterface";
import { getHostFromUrl } from "@src/util/getHostFromUrl";

const RESET_WEBSITE_USAGE_DURATION_THRESHOLD = 30 * 60 * 1000;

export const ContentScriptMain: (props: {
  isShowFullMinderInitially: boolean;
}) => JSX.Element = (props) => {
  const host = getHostFromUrl(window.location.href);
  const [getIsShowFullMinder, setIsShowFullMinder] = createSignal(
    props.isShowFullMinderInitially,
  );

  onMount(async () => {
    if (props.isShowFullMinderInitially) {
      setTimeout(() => {
        updateSyncData({
          lastBlocked: Date.now(),
          lastBlockedUrl: window.location.href,
        });
      }, 8000);
    }

    const dataForHost = await loadDataForHost(host);

    if (
      dataForHost &&
      Date.now() - RESET_WEBSITE_USAGE_DURATION_THRESHOLD >
        dataForHost.lastUsedTS
    ) {
      updateHostsEntry(host, {
        lastUsedTS: Date.now(),
        sessionDurationInS: 0,
      });
    } else {
      updateHostsEntry(host, { lastUsedTS: Date.now() });
    }
  });

  return (
    <>
      {getIsShowFullMinder() ? (
        <Interaction
          host={host}
          onHideAll={() => document.getElementById("minded-6622").remove()}
        />
      ) : (
        <LittleSunComponent
          host={host}
          mode="SINGLE_SUN"
          wasAnswerGiven={false}
          onShowQuestionAgain={() => undefined}
          onChangeQuestion={() => undefined}
          onShowFreshQuestion={() => setIsShowFullMinder(true)}
          teardown={() => document.getElementById("minded-6622").remove()}
        ></LittleSunComponent>
      )}
    </>
  );
};

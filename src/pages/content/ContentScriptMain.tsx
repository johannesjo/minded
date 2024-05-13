/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
// @ts-ignore
import { updateSyncData } from "@dataInterface/syncDataInterface";
import { InteractionWeb } from "@src/shared/components/interaction/InteractionWeb";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import {
  loadDataForHost,
  updateHostsEntry,
  // @ts-ignore
} from "@dataInterface/localDataInterface";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";

const RESET_WEBSITE_USAGE_DURATION_THRESHOLD = 30 * 60 * 1000;

export const ContentScriptMain: (props: {
  isShowFullMinderInitially: boolean;
}) => JSX.Element = (props) => {
  const host = getHostFromUrl(window.location.href);
  const [getIsShowFullMinder, setIsShowFullMinder] = createSignal(
    props.isShowFullMinderInitially,
  );

  onMount(async () => {
    addDayTimeDependentClass();

    if (props.isShowFullMinderInitially) {
      setTimeout(() => {
        updateSyncData({
          lastBlockedTS: Date.now(),
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
        <InteractionWeb
          host={host}
          onHideAll={() => document.getElementById("minded-6622").remove()}
        />
      ) : (
        <LittleSunComponent
          host={host}
          wasAnswerGiven={false}
          onShowQuestionAgain={() => undefined}
          onShowFreshQuestion={() => setIsShowFullMinder(true)}
          teardown={() => document.getElementById("minded-6622").remove()}
        ></LittleSunComponent>
      )}
    </>
  );
};

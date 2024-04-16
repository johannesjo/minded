/* @refresh reload */
import { JSX, onMount } from "solid-js";
import { updateSyncData } from "@src/shared/data/syncDataInterface";
import { Interaction } from "@src/shared/components/interaction/Interaction";
import { AfterSunComponent } from "@src/shared/components/interaction/AfterSun";
import {
  loadDataForHost,
  updateHostsEntry,
} from "@src/shared/data/localDataInterface";
import { getHostFromUrl } from "@src/util/getHostFromUrl";

const RESET_WEBSITE_USAGE_DURATION_THRESHOLD = 30 * 60 * 1000;

export const ContentScriptMain: (props: {
  isShowFullMinder: boolean;
}) => JSX.Element = (props) => {
  const host = getHostFromUrl(window.location.href);

  onMount(async () => {
    if (props.isShowFullMinder) {
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
      {props.isShowFullMinder ? (
        <Interaction
          host={host}
          onHideAll={() => document.getElementById("minded-6622").remove()}
        />
      ) : (
        <AfterSunComponent
          host={host}
          mode="SINGLE_SUN"
          wasAnswerGiven={false}
          onShowQuestionAgain={() => undefined}
          onChangeQuestion={() => undefined}
          teardown={() => document.getElementById("minded-6622").remove()}
        ></AfterSunComponent>
      )}
    </>
  );
};

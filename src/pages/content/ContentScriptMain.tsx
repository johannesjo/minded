/* @refresh reload */
import { JSX, onMount } from "solid-js";
import { updateSyncData } from "@src/shared/data/dataInterface";
import { Interaction } from "@src/shared/components/interaction/Interaction";
import { AfterSunComponent } from "@src/shared/components/interaction/AfterSun";

export const ContentScriptMain: (props: {
  isShowFullMinder: boolean;
}) => JSX.Element = (props) => {
  onMount(() => {
    if (props.isShowFullMinder) {
      setTimeout(() => {
        updateSyncData({
          lastBlocked: Date.now(),
          lastBlockedUrl: window.location.href,
        });
      }, 8000);
    }
  });

  return (
    <>
      {props.isShowFullMinder ? (
        <Interaction
          onHideAll={() => document.getElementById("minded-6622").remove()}
        />
      ) : (
        <AfterSunComponent
          teardown={() => document.getElementById("minded-6622").remove()}
        ></AfterSunComponent>
      )}
    </>
  );
};

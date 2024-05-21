// @ts-ignore
import styles from "./MainAndroid.module.scss";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onMount } from "solid-js";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";

const MainAndroid = () => {
  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);

  const refreshMissingCapabilities = () => {
    console.log("____________________________________________________-");
    console.log(androidInterface.getMissingCapabilities());

    console.log(JSON.parse(androidInterface.getMissingCapabilities()));

    setMissingCapabilities(
      JSON.parse(androidInterface.getMissingCapabilities()),
    );
  };

  onMount(() => {
    refreshMissingCapabilities();

    window.addEventListener(ANDROID_EV_RESUME, () => {
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
      refreshMissingCapabilities();
    });
  });

  return (
    <>
      <h1>JOO</h1>
      {getMissingCapabilities().toString()}

      {getMissingCapabilities().length > 0 ? (
        <div id="minded-6622-coloured-wrapper">
          <MissingCapabilityView
            missingCapabilities={getMissingCapabilities()}
          />
        </div>
      ) : (
        <RoutesCmp />
      )}
    </>
  );
};

export default MainAndroid;

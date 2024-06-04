import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onMount } from "solid-js";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import {
  addWrapperClasses,
  setIsDarkModeIfApplies,
} from "@src/shared/addWrapperClasses";
import { SyncData } from "@src/dataInterface/syncData";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { OnboardingAndroid } from "@src/android/components/onboardingAndroid/OnboardingAndroid";

const MainAndroid = () => {
  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);

  onMount(() => {
    addWrapperClasses();
  });

  const refresh = () => {
    setIsDarkModeIfApplies();

    getSyncData().then((syncData: SyncData) => {
      setIsShowOnboarding(!syncData.cfg.isOnboardingComplete);
    });

    setTimeout(() => {
      setMissingCapabilities(
        JSON.parse(androidInterface.getMissingCapabilities()) as string[],
      );
    });
  };

  onMount(() => {
    refresh();

    window.addEventListener(ANDROID_EV_RESUME, () => {
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
      refresh();
    });
  });

  return (
    <>
      {getIsShowOnboarding() ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <OnboardingAndroid onGoDashboard={() => refresh()} />
        </div>
      ) : (
        <>
          <RoutesCmp></RoutesCmp>

          {getMissingCapabilities().length > 0 && (
            <div
              onClick={() =>
                androidInterface.onMissingCapabilityClick(
                  getMissingCapabilities()[0],
                )
              }
              class="missingCapabilitiesMsg"
            >
              <em>minded</em> is missing permissions for displaying its overlay
              ({getMissingCapabilities()}). Click here to resolve!
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MainAndroid;

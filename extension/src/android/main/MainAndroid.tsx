import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onMount } from "solid-js";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { SyncData } from "@src/dataInterface/syncData";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { OnboardingAndroid } from "@src/android/components/onboardingAndroid/OnboardingAndroid";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";

const MainAndroid = () => {
  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);

  const [getIsShowMissingCapabilitiesPage, setIsShowMissingCapabilitiesPage] =
    createSignal(false);

  onMount(() => {
    addWrapperClasses();
  });

  const refresh = () => {
    getSyncData().then((syncData: SyncData) => {
      setIsShowOnboarding(!syncData.cfg.isOnboardingComplete);
      // setIsShowOnboarding(true);
      // if (
      //   !syncData.answers.length &&
      //   syncData.energyLvlTS <= DEFAULT_TS_VAL &&
      //   syncData.moodCheckTS <= DEFAULT_TS_VAL &&
      //   syncData.lastBrowsingBehaviorRatingTS <= DEFAULT_TS_VAL
      // ) {
      //   setIsShowOnboarding(!syncData.cfg.isOnboardingComplete);
      // }
    });

    setTimeout(() => {
      setMissingCapabilities(
        JSON.parse(androidInterface.getMissingCapabilities()),
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
          <OnboardingAndroid />
        </div>
      ) : getIsShowMissingCapabilitiesPage() &&
        getMissingCapabilities().length > 0 ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <MissingCapabilityView
            onAllConfigured={() => setIsShowMissingCapabilitiesPage(false)}
          />
        </div>
      ) : (
        <>
          <RoutesCmp></RoutesCmp>

          {getMissingCapabilities().length > 0 && (
            <div
              onClick={() => setIsShowMissingCapabilitiesPage(true)}
              class="missingCapabilitiesMsg"
            >
              <em>minded</em> is missing permissions for overlay. Click here to
              resolve!
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MainAndroid;

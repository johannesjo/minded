import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onCleanup, onMount } from "solid-js";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import {
  addWrapperClasses,
  setIsDarkModeIfApplies,
} from "@src/shared/addWrapperClasses";
import { safeJsonParse } from "@src/util/safeJsonParse";
import { SyncData } from "@src/dataInterface/syncData";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { OnboardingAndroid } from "@src/android/components/onboardingAndroid/OnboardingAndroid";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { resolveNightId } from "@src/shared/components/sleepWindDown/sleepWindDown.util";

const MainAndroid = () => {
  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  const [getIsShowMissingCapabilities, setIsShowMissingCapabilities] =
    createSignal(false);

  onMount(() => {
    addWrapperClasses();
  });

  const maybeTriggerSleepWindDown = (syncData: SyncData) => {
    const cfg = syncData.cfg.sleepWindDown;
    if (!cfg?.enabled) return;
    const nightId = resolveNightId(cfg);
    if (!nightId) return;
    if (syncData.sleepWindDownDismissedNightId === nightId) return;
    if ((syncData.sleepWindDownSnoozeUntilTS ?? 0) > Date.now()) return;
    // Already on the wind-down route? leave alone
    if (window.location.hash.includes("/sleepWindDown")) return;
    window.location.hash = "#/sleepWindDown";
  };

  const refresh = () => {
    setIsDarkModeIfApplies();

    getSyncData().then((syncData: SyncData) => {
      setIsShowOnboarding(!syncData.cfg.isOnboardingComplete);
      if (syncData.cfg.isOnboardingComplete) {
        maybeTriggerSleepWindDown(syncData);
      }
    });

    setTimeout(() => {
      setMissingCapabilities(
        safeJsonParse<string[]>(androidInterface.getMissingCapabilities(), []),
      );
    });
  };

  onMount(() => {
    refresh();

    const resumeHandler = () => {
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
      refresh();
    };
    window.addEventListener(ANDROID_EV_RESUME, resumeHandler);

    onCleanup(() => {
      window.removeEventListener(ANDROID_EV_RESUME, resumeHandler);
    });
  });

  return (
    <>
      {getIsShowMissingCapabilities() ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <MissingCapabilityView
            onAllConfigured={() => setIsShowMissingCapabilities(false)}
            onPermissionDenied={() => setIsShowMissingCapabilities(false)}
          />
        </div>
      ) : getIsShowOnboarding() ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <OnboardingAndroid onGoDashboard={() => refresh()} />
        </div>
      ) : (
        <RoutesCmp>
          {getMissingCapabilities().length > 0 && (
            <div
              onClick={() => setIsShowMissingCapabilities(true)}
              class="missingCapabilitiesMsg"
            >
              <em>minded</em> is missing permissions to work properly. Click
              here to resolve!
            </div>
          )}
        </RoutesCmp>
      )}
    </>
  );
};

export default MainAndroid;

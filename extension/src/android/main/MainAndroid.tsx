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
import { Ico } from "@src/shared/components/ui/Ico";

const MainAndroid = () => {
  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  const [getIsShowMissingCapabilities, setIsShowMissingCapabilities] =
    createSignal(false);
  // Setup deferral state. `getHasBlockedApps` starts true so the invitation
  // never flashes before the first read. `getIsShowSetup` re-opens the setup
  // flow (app picker onwards) from the dashboard invitation. The dismiss is
  // per-session by design: a quiet, recurring invitation, never a permanent
  // hide that would bury setup.
  const [getHasBlockedApps, setHasBlockedApps] = createSignal(true);
  const [getIsShowSetup, setIsShowSetup] = createSignal(false);
  const [getIsInviteDismissed, setIsInviteDismissed] = createSignal(false);
  const [getIsInviteDismissing, setIsInviteDismissing] = createSignal(false);

  const dismissInvite = () => {
    setIsInviteDismissing(true);
    setTimeout(() => setIsInviteDismissed(true), 300);
  };

  onMount(() => {
    addWrapperClasses();
  });

  const maybeTriggerSleepWindDown = (syncData: SyncData): boolean => {
    const cfg = syncData.cfg.sleepWindDown;
    if (!cfg?.enabled) return false;
    const nightId = resolveNightId(cfg);
    if (!nightId) return false;
    if (syncData.sleepWindDownDismissedNightId === nightId) return false;
    if ((syncData.sleepWindDownSnoozeUntilTS ?? 0) > Date.now()) return false;
    // Only auto-route from the dashboard root. If the user is mid-task in
    // settings, feedback, an interaction, or already in the wind-down flow,
    // don't yank them away on resume.
    const hash = window.location.hash;
    const atRoot = hash === "" || hash === "#" || hash === "#/";
    if (!atRoot) return false;
    window.location.hash = "#/sleepWindDown";
    return true;
  };

  const refresh = () => {
    setIsDarkModeIfApplies();

    getSyncData().then((syncData: SyncData) => {
      setIsShowOnboarding(!syncData.cfg.isOnboardingComplete);
      setHasBlockedApps((syncData.cfg.blockedApps?.length ?? 0) > 0);
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
      ) : getIsShowOnboarding() || getIsShowSetup() ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <OnboardingAndroid
            initialStep={getIsShowSetup() ? 1 : 0}
            onGoDashboard={() => {
              setIsShowSetup(false);
              refresh();
            }}
          />
        </div>
      ) : (
        <RoutesCmp>
          {!getHasBlockedApps() ? (
            !getIsInviteDismissed() && (
              <div
                classList={{
                  setupInvitationMsg: true,
                  isDismissing: getIsInviteDismissing(),
                }}
              >
                <div
                  class="setupInvitationMsgText"
                  onClick={() => setIsShowSetup(true)}
                >
                  The sun rests here whenever you open <em>minded</em>. To have
                  it meet you in your apps too, tell it where to appear.
                </div>
                <button
                  type="button"
                  class="setupInvitationMsgClose"
                  aria-label="dismiss"
                  onClick={dismissInvite}
                >
                  <Ico name="close" />
                </button>
              </div>
            )
          ) : getMissingCapabilities().length > 0 ? (
            <div
              onClick={() => setIsShowMissingCapabilities(true)}
              class="missingCapabilitiesMsg"
            >
              <em>minded</em> is missing permissions to work properly. Click
              here to resolve!
            </div>
          ) : null}
        </RoutesCmp>
      )}
    </>
  );
};

export default MainAndroid;

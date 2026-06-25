import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onCleanup, onMount } from "solid-js";
import {
  ANDROID_EV_PAUSE,
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { REFRESH_DASHBOARD_EV, RE_GREET_DASHBOARD_EV } from "@src/ev.const";
import {
  addWrapperClasses,
  setIsDarkModeIfApplies,
} from "@src/shared/addWrapperClasses";
import { safeJsonParse } from "@src/util/safeJsonParse";
import { SyncData } from "@src/dataInterface/syncData";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { OnboardingAndroid } from "@src/android/components/onboardingAndroid/OnboardingAndroid";
import {
  MissingCapabilityView,
  REQUIRED_CAPABILITIES,
} from "@src/android/components/missingCapabilities/MissingCapabilities";
import { resolveNightId } from "@src/shared/components/sleepWindDown/sleepWindDown.util";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";

// Kept in sync with the `.setupInvitationMsg` opacity transition in
// indexMainAndroid.scss so the element finishes fading before it unmounts.
const INVITE_FADE_MS = 300;

// How long the app must have been backgrounded for a return to count as a fresh
// visit (and re-greet with a new dashboard tile). Below this, a quick switch out
// and back — glancing at a notification, copying a 2FA code — keeps the current
// tile, so the greeting never feels restless. Tune here.
const MIN_ABSENCE_FOR_REGREET_MS = 90_000;

const MainAndroid = () => {
  const [getMissingCapabilities, setMissingCapabilities] = createSignal<
    string[]
  >([]);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  const [getIsShowMissingCapabilities, setIsShowMissingCapabilities] =
    createSignal(false);
  // Setup deferral state. `getHasBlockedApps` starts true so the invitation
  // never flashes before the first read. `getIsShowSetup` re-opens the setup
  // flow (app picker onwards) from the dashboard invitation. Dismiss is a quiet
  // "not now": it hides the invitation for the current visit and is reset when
  // the user returns to the app (see the resume handler), so it recurs gently
  // and is never a permanent hide that would bury setup.
  const [getHasBlockedApps, setHasBlockedApps] = createSignal(true);
  const [getIsShowSetup, setIsShowSetup] = createSignal(false);
  const [getIsInviteDismissed, setIsInviteDismissed] = createSignal(false);
  const [getIsInviteDismissing, setIsInviteDismissing] = createSignal(false);

  let dismissT: NodeJS.Timeout | undefined;
  const dismissInvite = () => {
    setIsInviteDismissing(true);
    dismissT = setTimeout(() => setIsInviteDismissed(true), INVITE_FADE_MS);
  };
  onCleanup(() => clearTimeout(dismissT));

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

  // When the app last went to the background. Seeded with "now" so the first
  // onResume after a cold launch (which has no preceding pause) reads as a tiny
  // absence and doesn't re-greet the tile the dashboard just mounted with.
  let backgroundedAtTs = Date.now();

  onMount(() => {
    refresh();

    const pauseHandler = () => {
      backgroundedAtTs = Date.now();
    };

    const resumeHandler = () => {
      // A fresh return to the app re-offers the (dismissible) setup invitation;
      // the render still gates it on there being no blocked apps.
      setIsInviteDismissed(false);
      setIsInviteDismissing(false);
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
      // Only treat this as a fresh visit — re-rolling the greeting so the tile
      // feels new — if the app was actually away for a while. A quick switch out
      // and back keeps the current tile (see MIN_ABSENCE_FOR_REGREET_MS). The
      // WebView isn't reloaded on resume, so the dashboard never remounts to do
      // this on its own.
      if (Date.now() - backgroundedAtTs >= MIN_ABSENCE_FOR_REGREET_MS) {
        window.dispatchEvent(new Event(RE_GREET_DASHBOARD_EV));
      }
      refresh();
    };
    window.addEventListener(ANDROID_EV_PAUSE, pauseHandler);
    window.addEventListener(ANDROID_EV_RESUME, resumeHandler);

    onCleanup(() => {
      window.removeEventListener(ANDROID_EV_PAUSE, pauseHandler);
      window.removeEventListener(ANDROID_EV_RESUME, resumeHandler);
    });
  });

  // Distinguishes a banner that must alarm (a required permission is missing, so
  // minded can't intervene at all) from one that should merely invite (only the
  // advisory extras remain — minded already works).
  const hasMissingRequired = () =>
    getMissingCapabilities().some((c) => REQUIRED_CAPABILITIES.includes(c));

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
                  role="button"
                  tabindex="0"
                  onClick={() => setIsShowSetup(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsShowSetup(true);
                    }
                  }}
                >
                  The sun rests here whenever you open <em>minded</em>. To have
                  it meet you in your apps too, tell it where to appear.
                </div>
                <Btn
                  variant="icon"
                  plain
                  class="setupInvitationMsgClose"
                  aria-label="Dismiss"
                  onClick={dismissInvite}
                >
                  <Ico name="close" />
                </Btn>
              </div>
            )
          ) : /* No apps configured means permissions are moot (nothing to
                intervene on), so the missing-permissions banner is intentionally
                suppressed until at least one app is chosen — the invitation above
                is the single, calm entry point into setup. */
          getMissingCapabilities().length > 0 ? (
            <div
              onClick={() => setIsShowMissingCapabilities(true)}
              classList={{
                missingCapabilitiesMsg: true,
                // Only the advisory extras are missing → quiet outline, not an
                // alarm: minded already works, so the banner invites rather
                // than warns.
                missingCapabilitiesMsgSoft: !hasMissingRequired(),
              }}
            >
              {hasMissingRequired() ? (
                <>
                  <em>minded</em> is missing permissions to work properly. Click
                  here to resolve!
                </>
              ) : (
                <>
                  Optional permissions can help the sun appear more reliably.
                  Tap to add them.
                </>
              )}
            </div>
          ) : null}
        </RoutesCmp>
      )}
    </>
  );
};

export default MainAndroid;

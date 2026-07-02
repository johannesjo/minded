import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onCleanup, onMount } from "solid-js";
import {
  ANDROID_EV_PAUSE,
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import {
  REFRESH_DASHBOARD_EV,
  RE_GREET_DASHBOARD_HIDDEN_EV,
} from "@src/ev.const";
import {
  addWrapperClasses,
  companionWord,
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
import { fadeOutThen } from "@src/util/animation";

// Kept in sync with the `.setupInvitationMsg` opacity transition in
// indexMainAndroid.scss so the element finishes fading before it unmounts.
const INVITE_FADE_MS = 300;

// How long the app must have been in the foreground before backgrounding it
// re-greets the dashboard (staging a fresh tile for the next return). The swap
// happens on *pause*, while the app is hidden — so the card is never changed in
// front of the user; the fresh tile is simply already there when they come back.
// Below this, a quick open-and-leave — glancing in, copying a 2FA code — keeps
// the current tile, so the greeting never feels restless. Tune here.
const MIN_FOREGROUND_FOR_REGREET_MS = 90_000;

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

  // Fade the current top-level surface fully out, then run the state change that
  // swaps it — so the leaving surface eases out before the next eases in via its
  // own pageTransitionIn (a clean sequential fade, never a hard cut). The
  // top-level surfaces (missing-capabilities, onboarding/setup, dashboard) share
  // the id below and unmount the instant the signal flips, so the faded node is
  // simply discarded — nothing to reset. The guard stops a second tap stacking a
  // fade mid-flight. (The onboarding→dashboard exit deliberately bypasses this —
  // see onGoDashboard.)
  let isTopLevelLeaving = false;
  const fadeTopLevelThen = (mutate: () => void) => {
    if (isTopLevelLeaving) return;
    isTopLevelLeaving = true;
    fadeOutThen(document.getElementById("minded-6622-coloured-wrapper"), () => {
      isTopLevelLeaving = false;
      mutate();
    });
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
      // Only ever *enter* onboarding from here — never leave it. Reaching the
      // optional step marks onboarding complete (so a force-quit won't replay
      // the welcome), yet the flow is still on screen and keeps sending the user
      // out to system settings to grant permissions. Each return fires a
      // resume → refresh; honouring the flag here would tear the flow down and
      // drop the user onto the dashboard mid-step. Leaving is driven only by
      // onGoDashboard.
      if (!syncData.cfg.isOnboardingComplete) {
        setIsShowOnboarding(true);
      }
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

  // When the app last came to the foreground. Seeded with "now" for the cold
  // launch (which has no preceding resume) so a quick open-and-leave right after
  // launch keeps the tile the dashboard just mounted with.
  let foregroundedAtTs = Date.now();

  onMount(() => {
    refresh();

    const pauseHandler = () => {
      // Re-roll the greeting *now*, as the app goes to the background and the
      // dashboard is hidden — so a fresh tile is already in place when the user
      // returns and the card never changes in front of them (calm is the
      // product; a card only ever changes offscreen). Only if the app was
      // actually in use for a while: a quick open-and-leave keeps the current
      // tile so the greeting never feels restless (see
      // MIN_FOREGROUND_FOR_REGREET_MS). The WebView isn't reloaded on resume, so
      // the dashboard never remounts to re-greet on its own.
      if (Date.now() - foregroundedAtTs >= MIN_FOREGROUND_FOR_REGREET_MS) {
        window.dispatchEvent(new Event(RE_GREET_DASHBOARD_HIDDEN_EV));
      }
    };

    const resumeHandler = () => {
      foregroundedAtTs = Date.now();
      // A fresh return to the app re-offers the (dismissible) setup invitation;
      // the render still gates it on there being no blocked apps.
      setIsInviteDismissed(false);
      setIsInviteDismissing(false);
      // Sync any data that changed while away, preserving the current
      // arrangement — the greeting itself was already re-rolled on pause, hidden.
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
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
            onAllConfigured={() =>
              fadeTopLevelThen(() => setIsShowMissingCapabilities(false))
            }
            onPermissionDenied={() =>
              fadeTopLevelThen(() => setIsShowMissingCapabilities(false))
            }
          />
        </div>
      ) : getIsShowOnboarding() || getIsShowSetup() ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <OnboardingAndroid
            initialStep={getIsShowSetup() ? 1 : 0}
            onGoDashboard={() => {
              // Sole exit from the flow: refresh() never lowers this flag (see
              // above), so the onboarding/setup screens stay up until the user
              // actually finishes here. Deliberately NOT fadeTopLevelThen: the
              // flow has already faded its own chrome and glided the ONE disc
              // onto the companion anchor (leaveToDashboard), so fading the
              // wrapper here would take that landed sun down with it and dip
              // the screen to black before the dashboard pops in. The bare swap
              // is seamless instead — both wrappers share the id that paints
              // the sky, the shell sun takes over the disc in place, and the
              // dashboard content eases in via its own pageTransitionIn.
              setIsShowOnboarding(false);
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
                  onClick={() => fadeTopLevelThen(() => setIsShowSetup(true))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fadeTopLevelThen(() => setIsShowSetup(true));
                    }
                  }}
                >
                  The {companionWord()} rests here whenever you open{" "}
                  <em>minded</em>. To have it meet you in your apps too, tell it
                  where to appear.
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
              onClick={() =>
                fadeTopLevelThen(() => setIsShowMissingCapabilities(true))
              }
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
                  <em>minded</em> needs a few permissions before it can meet
                  you. Tap to finish setting up.
                </>
              ) : (
                <>
                  Optional permissions can help the {companionWord()} appear
                  more reliably. Tap to add them.
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

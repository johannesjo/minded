import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onCleanup, onMount } from "solid-js";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import {
  addWrapperClasses,
  companionWord,
  setIsDarkModeIfApplies,
} from "@src/shared/addWrapperClasses";
import {
  IOS_DID_BECOME_ACTIVE,
  IOS_DID_ENTER_BACKGROUND,
  IOS_EV_RESUME,
  IOS_WILL_ENTER_FOREGROUND,
} from "@src/dataInterface/ios/iosInterface";
import { MindedIOSPlugin } from "@src/ios/plugin/MindedIOSPlugin";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { SyncData } from "@src/dataInterface/syncData";
import { OnboardingIOS } from "@src/ios/components/onboardingIOS/OnboardingIOS";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { fadeOutThen } from "@src/util/animation";

// Kept in sync with the `.setupInvitationMsg` opacity transition in
// indexMainIOS.scss so the element finishes fading before it unmounts.
const INVITE_FADE_MS = 300;

const MainIOS = () => {
  // NOTE: we start with false, since events might have been triggered before app start
  const [getIsHide, setIsHide] = createSignal<boolean>(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  // Re-opens the widget step from the dashboard invitation.
  const [getIsShowWidgetSetup, setIsShowWidgetSetup] = createSignal(false);
  // The widget invitation's gate: the OBSERVED Home Screen state
  // (WidgetCenter via the plugin), so the nudge is truthful and retires
  // itself the moment a widget exists. Starts true so it never flashes
  // before the first read — and stays true on older native shells without
  // the plugin method ("unknown" must never nag).
  const [getIsWidgetInstalled, setIsWidgetInstalled] = createSignal(true);
  // Dismiss is a quiet "not now": hides the invitation for the current visit,
  // reset on the next return (mirrors the Android setup invitation).
  const [getIsInviteDismissed, setIsInviteDismissed] = createSignal(false);
  const [getIsInviteDismissing, setIsInviteDismissing] = createSignal(false);

  let dismissT: NodeJS.Timeout | undefined;
  const dismissInvite = () => {
    setIsInviteDismissing(true);
    dismissT = setTimeout(() => setIsInviteDismissed(true), INVITE_FADE_MS);
  };
  onCleanup(() => clearTimeout(dismissT));

  // Fade the current top-level surface fully out, then swap — the same
  // sequential soft hand-off MainAndroid uses (never a hard cut).
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
    MindedIOSPlugin.continueToApp();
  });

  const refreshWidgetInstalled = () => {
    MindedIOSPlugin.isWidgetInstalled()
      .then((r) => setIsWidgetInstalled(!!r.isInstalled))
      .catch(() => {
        // Older native shell without the method: unknown state — keep the
        // default true so the invitation never nags about a widget the build
        // might not even carry.
      });
  };

  const refresh = () => {
    setIsDarkModeIfApplies();

    getSyncData().then((syncData: SyncData) => {
      // Only ever *enter* onboarding from here — leaving is driven solely by
      // onGoDashboard (the flow marks itself complete on its way out), so a
      // resume mid-flow can't tear it down (same rule as MainAndroid).
      if (!syncData.cfg.isOnboardingComplete) {
        setIsShowOnboarding(true);
      }
    });
    refreshWidgetInstalled();
  };

  onMount(() => {
    refresh();

    window.addEventListener(IOS_EV_RESUME, () => {
      // A fresh return re-offers the (dismissible) widget invitation and
      // re-reads the observed Home Screen state.
      setIsInviteDismissed(false);
      setIsInviteDismissing(false);
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
      refresh();
    });

    window.addEventListener(IOS_DID_BECOME_ACTIVE, () => {
      setIsHide(false);
    });
    window.addEventListener(IOS_WILL_ENTER_FOREGROUND, () => {
      setIsHide(false);
      // Returning from the Home Screen is exactly when a just-added widget
      // becomes observable.
      refreshWidgetInstalled();
    });
    window.addEventListener(IOS_DID_ENTER_BACKGROUND, () => {
      setIsHide(true);
    });
  });

  return (
    <>
      {getIsHide() ? (
        <div id="minded-6622-coloured-wrapper" />
      ) : getIsShowOnboarding() || getIsShowWidgetSetup() ? (
        <div id="minded-6622-coloured-wrapper" class="pageWrapper">
          <OnboardingIOS
            initialStep={getIsShowWidgetSetup() ? 1 : 0}
            onGoDashboard={() => {
              // The flow has already faded its chrome and glided the ONE disc
              // onto the companion anchor; the bare swap keeps that landed sun
              // in place for the shell to take over (see MainAndroid's
              // onGoDashboard for the full story).
              setIsShowOnboarding(false);
              setIsShowWidgetSetup(false);
              refresh();
            }}
          />
        </div>
      ) : (
        <RoutesCmp>
          {!getIsWidgetInstalled() && !getIsInviteDismissed() && (
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
                onClick={() => fadeTopLevelThen(() => setIsShowWidgetSetup(true))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fadeTopLevelThen(() => setIsShowWidgetSetup(true));
                  }
                }}
              >
                The {companionWord()} rests here whenever you open{" "}
                <em>minded</em>. To have it wait on your Home Screen too, give
                it a widget.
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
          )}
        </RoutesCmp>
      )}
    </>
  );
};

export default MainIOS;

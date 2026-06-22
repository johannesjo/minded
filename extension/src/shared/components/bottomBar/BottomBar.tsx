import styles from "./BottomBar.module.scss";

import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { IS_IOS } from "@src/dataInterface/commonSyncDataInterface";
import { shouldUseWindDownHistoryBackForBottomBar } from "@src/shared/components/sleepWindDown/sleepWindDownBackNavigation";
import { fadeOut } from "@src/util/animation";

// Matches --dur-soft (the page-level fade) so leaving a page eases out at the
// same pace "show all" eases in — never a hard cut (see the styling rules).
const BACK_FADE_MS = 480;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BottomBar = () => {
  const [getIsOnDashboard, setIsOnDashboard] = createSignal<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  let isLeaving = false;

  createEffect(() => {
    setIsOnDashboard(location.pathname === "/");
  });

  const goBack = () => {
    if (getIsOnDashboard()) return;
    if (isLeaving) return;

    // Wind-down owns its own back semantics: history.back() swaps an *internal*
    // view (the route stays mounted), so it keeps its existing transition.
    // Fading the page node here would strand that same node at opacity 0.
    if (shouldUseWindDownHistoryBackForBottomBar(location.pathname)) {
      window.history.back();
      return;
    }

    // Fade the leaving page out the instant the arrow is tapped — never a hard
    // cut. The bottom bar and the companion sun live outside <main>, so only
    // the page itself fades; the destination eases back in via its own
    // pageTransitionIn. We fade the page's own root node (not <main>) so it's
    // simply discarded when navigate("/") remounts the route — nothing to
    // reset, no flash of the old page at full opacity.
    const leavingPage = document.querySelector("main")
      ?.firstElementChild as HTMLElement | null;

    if (!leavingPage || prefersReducedMotion()) {
      navigate("/");
      return;
    }

    isLeaving = true;
    fadeOut(leavingPage, BACK_FADE_MS).promise.then(() => {
      isLeaving = false;
      navigate("/");
    });
  };

  return (
    <div
      onClick={goBack}
      style={!getIsOnDashboard() ? { cursor: "pointer" } : {}}
      class={`${styles.bottomBarWrapper}  ${getIsOnDashboard() && styles.isOnDashboard} `}
    >
      {getIsOnDashboard() ? (
        <>
          <Btn
            variant="icon"
            plain
            title="Give us some feedback"
            aria-label="Give us some feedback"
            href="/feedback"
            activeClass="active"
          >
            <Ico name="feedback" />
          </Btn>
          {!IS_IOS && (
            <Btn
              variant="icon"
              plain
              title="Go to settings page"
              aria-label="Go to settings page"
              href="/settings"
              activeClass="active"
            >
              <Ico name="settings" />
            </Btn>
          )}
        </>
      ) : (
        <Btn
          variant="icon"
          plain
          title={
            shouldUseWindDownHistoryBackForBottomBar(location.pathname)
              ? "Go back"
              : "Go to dashboard"
          }
          aria-label={
            shouldUseWindDownHistoryBackForBottomBar(location.pathname)
              ? "Go back"
              : "Go to dashboard"
          }
          onClick={(event) => {
            event.stopPropagation();
            goBack();
          }}
        >
          <Ico name="arrowBack" />
        </Btn>
      )}
    </div>
  );
};

export default BottomBar;

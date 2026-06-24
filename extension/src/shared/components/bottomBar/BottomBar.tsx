import styles from "./BottomBar.module.scss";

import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { IS_IOS } from "@src/dataInterface/commonSyncDataInterface";
import { shouldUseWindDownHistoryBackForBottomBar } from "@src/shared/components/sleepWindDown/sleepWindDownBackNavigation";
import { navigateWithPageFadeOut } from "@src/util/animation";

const BottomBar = () => {
  const [getIsOnDashboard, setIsOnDashboard] = createSignal<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    setIsOnDashboard(location.pathname === "/");
  });

  const goBack = () => {
    if (getIsOnDashboard()) return;

    // Wind-down owns its own back semantics: history.back() swaps an *internal*
    // view (the route stays mounted), so it keeps its existing transition.
    // Fading the page node here would strand that same node at opacity 0.
    if (shouldUseWindDownHistoryBackForBottomBar(location.pathname)) {
      window.history.back();
      return;
    }

    // Fade the leaving page fully out the instant the arrow is tapped, then
    // return to the dashboard — never a hard cut. The destination eases back in
    // via its own pageTransitionIn.
    navigateWithPageFadeOut(navigate, "/");
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
            onClick={(event) => {
              event.stopPropagation();
              navigateWithPageFadeOut(navigate, "/feedback");
            }}
          >
            <Ico name="feedback" />
          </Btn>
          {!IS_IOS && (
            <Btn
              variant="icon"
              plain
              title="Go to settings page"
              aria-label="Go to settings page"
              onClick={(event) => {
                event.stopPropagation();
                navigateWithPageFadeOut(navigate, "/settings");
              }}
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

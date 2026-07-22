import styles from "./BottomBar.module.scss";

import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { IS_IOS } from "@src/dataInterface/commonSyncDataInterface";
import { shouldUseWindDownHistoryBackForBottomBar } from "@src/shared/components/sleepWindDown/sleepWindDownBackNavigation";

const BottomBar = (props: { inert?: boolean }) => {
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

    // Return to the dashboard - never a hard cut. The router-level page-fade
    // interceptor (RouteCmp) eases the leaving page out before the dashboard
    // eases back in via its own pageTransitionIn.
    navigate("/");
  };

  return (
    <div
      inert={props.inert ? true : undefined}
      onClick={goBack}
      style={!getIsOnDashboard() ? { cursor: "pointer" } : {}}
      class={`${styles.bottomBarWrapper}  ${getIsOnDashboard() && styles.isOnDashboard} `}
    >
      {getIsOnDashboard() ? (
        // iOS is the widget-only variant: it has no settings page (nothing to
        // configure), so it carries no feedback icon either - a lone feedback
        // button with no settings beside it reads as misplaced/incomplete. The
        // other platforms show both. The sun still rests centred over this bar.
        !IS_IOS && (
          <>
            {/*
              Real internal links (router <A>) - the router-level page-fade
              interceptor eases the transition, so no onClick wrapping is needed.
              These only render on the dashboard, where the wrapper's goBack()
              early-returns, so the bubbling click is harmless.
            */}
            <Btn
              variant="icon"
              plain
              href="/feedback"
              title="Give us some feedback"
              aria-label="Give us some feedback"
            >
              <Ico name="feedback" />
            </Btn>
            <Btn
              variant="icon"
              plain
              href="/settings"
              title="Go to settings page"
              aria-label="Go to settings page"
            >
              <Ico name="settings" />
            </Btn>
          </>
        )
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

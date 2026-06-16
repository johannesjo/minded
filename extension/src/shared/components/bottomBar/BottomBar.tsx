import styles from "./BottomBar.module.scss";

import { A, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import { IS_IOS } from "@src/dataInterface/commonSyncDataInterface";
import { shouldUseWindDownHistoryBackForBottomBar } from "@src/shared/components/sleepWindDown/sleepWindDownBackNavigation";

const BottomBar = () => {
  const [getIsOnDashboard, setIsOnDashboard] = createSignal<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    setIsOnDashboard(location.pathname === "/");
  });

  const goBack = () => {
    if (getIsOnDashboard()) return;
    if (shouldUseWindDownHistoryBackForBottomBar(location.pathname)) {
      window.history.back();
      return;
    }
    navigate("/");
  };

  return (
    <div
      onClick={goBack}
      style={!getIsOnDashboard() ? { cursor: "pointer" } : {}}
      class={`${styles.bottomBarWrapper}  ${getIsOnDashboard() && styles.isOnDashboard} `}
    >
      {getIsOnDashboard() ? (
        <>
          <A
            title="Give us some feedback"
            aria-label="Give us some feedback"
            class="btnIcoOnly"
            href="/feedback"
            activeClass="active"
          >
            <Ico name="feedback" />
          </A>
          {!IS_IOS && (
            <A
              title="Go to settings page"
              aria-label="Go to settings page"
              class="btnIcoOnly"
              href="/settings"
              activeClass="active"
            >
              <Ico name="settings" />
            </A>
          )}
        </>
      ) : (
        <button
          type="button"
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
          class="btnIcoOnly"
          onClick={(event) => {
            event.stopPropagation();
            goBack();
          }}
        >
          <Ico name="arrowBack" />
        </button>
      )}
    </div>
  );
};

export default BottomBar;

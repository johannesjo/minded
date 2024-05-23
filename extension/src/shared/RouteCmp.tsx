import { HashRouter, Route, useNavigate } from "@solidjs/router";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, JSX, onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { SettingsWeb } from "@src/shared/components/settings/SettingsWeb";
import Feedback from "@src/shared/components/feedback/Feedback";
import BottomBar from "@src/shared/components/bottomBar/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
// @ts-expect-error
import { getSyncData } from "@dataInterface/syncDataInterface";
import { SyncData } from "@src/dataInterface/syncData";
import { SettingsAndroidRoute } from "@src/android/components/settingsAndroid/SettingsAndroidRoute";

const MainWrapper = (props: { children: JSX.Element }): JSX.Element => {
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(false);
  const [getIsOnboardingActive, setIsOnboardingActive] =
    createSignal<boolean>(false);

  const navigate = useNavigate();

  onMount(() => {
    addWrapperClasses();
    getSyncData().then((syncData: SyncData) => {
      setIsOnboardingActive(!syncData.cfg.isOnboardingComplete);

      if (
        !syncData || IS_ANDROID
          ? !syncData.cfg.blockedApps.length
          : !syncData.cfg.blockedHosts.length
      ) {
        navigate("/settings");
      }
    });
  });

  return (
    <>
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom:  var(--bottom-bar-height); overflow: auto;">
        {props.children}
        {getIsOnboardingActive() && (
          <>
            <h1>XXXXXXXX</h1>
          </>
        )}
      </div>
      <BottomBar onShowQuestion={() => setIsShowQuestionOverlay(true)} />

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          onPossibleNewData={() => {
            window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
          }}
          onHideInteraction={() => {
            setIsShowQuestionOverlay(false);
          }}
        />
      )}
    </>
  );
};

const RoutesCmp = () => {
  return (
    <div id="minded-6622-coloured-wrapper">
      <HashRouter root={MainWrapper as any}>
        <Route path="*" component={Dashboard} />
        <Route
          path="/questionCategory/:questionCategoryId"
          component={QuestionCategoryView}
        />
        {IS_ANDROID && (
          <Route path="/settings" component={SettingsAndroidRoute} />
        )}
        {!IS_ANDROID && <Route path="/settings" component={SettingsWeb} />}
        <Route path="/feedback" component={Feedback} />
      </HashRouter>
    </div>
  );
};

export default RoutesCmp;

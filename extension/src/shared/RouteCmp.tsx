import { HashRouter, Route } from "@solidjs/router";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, JSX, onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import Feedback from "@src/shared/components/feedback/Feedback";
import BottomBar from "@src/shared/components/bottomBar/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { SettingsAndroidRoute } from "@src/android/components/settingsAndroid/SettingsAndroidRoute";
import { SettingsWebRoute } from "@src/pages/newtab/components/settingsWebRoute/SettingsWebRoute";
// @ts-ignore
import styles from "./RouteCmp.module.scss";
import DailyQuestions from "@src/shared/components/dailyQuestions/DailyQuestions";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

const MainWrapper = (props: { children: JSX.Element }): JSX.Element => {
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(false);

  // const navigate = useNavigate();

  onMount(() => {
    addWrapperClasses();
    // getSyncData().then((syncData: SyncData) => {
    //   if (
    //     !syncData || IS_ANDROID
    //       ? !syncData.cfg.blockedApps.length
    //       : !syncData.cfg.blockedHosts.length
    //   ) {
    //     navigate("/settings");
    //   }
    // });
  });

  return (
    <>
      <main class={styles.contentWrapper}>{props.children}</main>

      <BottomBar
        onShowQuestion={() => {
          setIsShowQuestionOverlay(true);
        }}
      />

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

const RoutesCmp = (props: { children: JSX.Element }) => {
  return (
    <div id="minded-6622-coloured-wrapper" class={styles.mainWrapper}>
      {props.children}
      {/*<div*/}
      {/*  class="missingCapabilitiesMsg"*/}
      {/*  style="border: 2px solid red; min-height: 100px"*/}
      {/*>*/}
      {/*  <em>minded</em> is missing permissions to work properly. Click here to*/}
      {/*  resolve!*/}
      {/*</div>*/}

      <HashRouter root={MainWrapper as any}>
        <Route path="*" component={Dashboard} />
        <Route
          path="/questionCategory/:questionCategoryId"
          component={QuestionCategoryView}
        />
        {IS_ANDROID && (
          <Route path="/settings" component={SettingsAndroidRoute} />
        )}
        {!IS_ANDROID && <Route path="/settings" component={SettingsWebRoute} />}
        <Route path="/feedback" component={Feedback} />
        <Route path="/dailyQuestions" component={DailyQuestions} />
      </HashRouter>
    </div>
  );
};

export default RoutesCmp;

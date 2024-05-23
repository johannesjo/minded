import { HashRouter, Route } from "@solidjs/router";
import React from "react";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, JSX, onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { SettingsAndroid } from "@src/shared/components/settings/SettingsAndroid";
import { SettingsWeb } from "@src/shared/components/settings/SettingsWeb";
import Feedback from "@src/shared/components/feedback/Feedback";
import BottomBar from "@src/shared/components/bottomBar/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";

const MainWrapper = (props: { children: JSX.Element }): JSX.Element => {
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(false);

  onMount(() => {
    addWrapperClasses();
  });

  return (
    <>
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom:  var(--bottom-bar-height); overflow: auto;">
        {props.children}
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
        {IS_ANDROID && <Route path="/settings" component={SettingsAndroid} />}
        {!IS_ANDROID && <Route path="/settings" component={SettingsWeb} />}
        <Route path="/feedback" component={Feedback} />
      </HashRouter>
    </div>
  );
};

export default RoutesCmp;

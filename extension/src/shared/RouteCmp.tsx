import { HashRouter, Route } from "@solidjs/router";
import React from "react";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { onMount } from "solid-js";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { SettingsAndroid } from "@src/shared/components/settings/SettingsAndroid";
import { SettingsWeb } from "@src/shared/components/settings/SettingsWeb";
import Feedback from "@src/shared/components/feedback/Feedback";

const RoutesCmp = () => {
  onMount(() => {
    addDayTimeDependentClass();
  });

  return (
    <div id="minded-6622-coloured-wrapper">
      <HashRouter>
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

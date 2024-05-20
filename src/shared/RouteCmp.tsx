import { HashRouter, Route } from "@solidjs/router";
import React from "react";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { onMount } from "solid-js";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";
import { IS_ANDROID } from "@src/dataInterface/extension/isAndroid";
import { SettingsAndroid } from "@src/shared/components/settings/SettingsAndroid";
import { SettingsWeb } from "@src/shared/components/settings/SettingsWeb";

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
      </HashRouter>
    </div>
  );
};

export default RoutesCmp;

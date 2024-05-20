import { HashRouter, Route, useNavigate } from "@solidjs/router";
import React from "react";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { onMount } from "solid-js";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";

const TetsCmp = () => {
  return (
    <h1>
      TESTSSS<a href="/a">/a</a>
      <a href="#/a">#/a</a>
    </h1>
  );
};

const RoutesCmp = () => {
  onMount(() => {
    addDayTimeDependentClass();
  });

  return (
    <>
      {/*<h1>RXOUTES</h1>*/}
      {/*<div style="position:relative; z-index: 9999999999999999999999">*/}
      {/*  <div>*/}
      {/*    <a href="/a">/a</a>*/}
      {/*  </div>*/}
      {/*  <div>*/}
      {/*    <a href="/">/</a>*/}
      {/*  </div>*/}
      {/*  <div>*/}
      {/*    <a href="#/">#/</a>*/}
      {/*  </div>*/}
      {/*  <div>*/}
      {/*    <a href="#/a">#/a</a>*/}
      {/*  </div>*/}
      {/*</div>*/}
      <HashRouter>
        <Route path="*" component={Dashboard} />
        <Route
          path="/questionCategory/:questionCategoryId"
          component={QuestionCategoryView}
        />
        <Route path="/a" component={TetsCmp} />
      </HashRouter>
    </>
  );
};

export default RoutesCmp;

/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { Question } from "@src/shared/components/Question";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";

export const ContentScriptMain: () => JSX.Element = () => {
  const [getIsShowDashboard, setIsShowDashboard] = createSignal(false);
  const [getIsQuestionHidden, setIsQuestionHidden] = createSignal(false);

  onMount(() => {
    // getSyncData().then((syncData) => {
    //   if(syncData.answers.length > 0 && syncData.answers.length % 10 === 0) {
    //     console.log("SHOW DASHBOARD");
    //     setIsShowDashboard(true);
    //   }
    //   // TODO mechanism to hide dashboard again
    // });
  });

  return (
    <>
      {getIsShowDashboard() ? (
        <Dashboard />
      ) : (
        !getIsQuestionHidden() && (
          <Question onHide={() => setIsQuestionHidden(true)} />
        )
      )}
    </>
  );
};

/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { Question } from "@src/shared/components/Question";

export const ContentScriptMain: () => JSX.Element = () => {
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

  // return <div style="width: 100%; height: 100vh; position: fixed; left: 0; right: 0; top: 0; background: white;">
  //   <div>
  //     <Question onHide={() => setIsQuestionHidden(true)} />
  //     <Dashboard />
  //   </div>
  // </div>;

  return (
    <>
      {!getIsQuestionHidden() && <Question onHide={() => setIsQuestionHidden(true)} />}
    </>
  );
};

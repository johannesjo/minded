/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { MindedQuestion } from "@src/shared/components/MindedQuestion";
import { MindedDashboard } from "@src/shared/components/MindedDashboard";

export const MindedWrapper: () => JSX.Element = () => {
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
        <MindedDashboard />
      ) : (
        !getIsQuestionHidden() && (
          <MindedQuestion onHide={() => setIsQuestionHidden(true)} />
        )
      )}
    </>
  );
};

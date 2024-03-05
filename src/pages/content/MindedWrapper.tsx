/* @refresh reload */
import { createEffect, createSignal, JSX } from "solid-js";
import { MindedQuestion } from "@src/shared/components/MindedQuestion";
import { getSyncData } from "@src/shared/data/dataInterface";
import { MindedDashboard } from "@src/shared/components/MindedDashboard";

export const MindedWrapper: () => JSX.Element = () => {
  const [getIsShowDashboard, setIsShowDashboard] = createSignal(false);
  const [getIsQuestionHidden, setIsQuestionHidden] = createSignal(false);

  createEffect((prev) => {
    console.log("EFFFECT");
    getSyncData().then((syncData) => {
      console.log("EFFFECT", syncData);
      if(syncData.answers.length % 8 === 0) {
        console.log("SHOW DASHBOARD");
        setIsShowDashboard(true);
      }
      // TODO mechanism to hide dashboard again
    });
  });

  return <>{getIsShowDashboard() ? <MindedDashboard />
    : !getIsQuestionHidden() && <MindedQuestion onHide={() => setIsQuestionHidden(true)} />}</>;
};

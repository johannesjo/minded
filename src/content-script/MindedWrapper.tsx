/* @refresh reload */
import { createEffect, createSignal, JSX } from "solid-js";
import { MindedQuestion } from "@src/content-script/MindedQuestion";
import { getSyncData } from "@src/data/dataInterface";
import { MindedDashboard } from "@src/content-script/MindedDashboard";

export const MindedWrapper: () => JSX.Element = () => {
  const [getIsShowDashboard, setIsShowDashboard] = createSignal(false);

  createEffect((prev) => {
    console.log("EFFFECT");
    getSyncData().then((syncData) => {
      console.log("EFFFECT", syncData);
      if (syncData.answers.length % 20 === 0) {
        console.log("SHOW DASHBOARD");
        setIsShowDashboard(true);
      }
      // TODO mechanism to hide dashboard again
    });
  });

  return <>{getIsShowDashboard() ? <MindedDashboard /> : <MindedQuestion />}</>;
};

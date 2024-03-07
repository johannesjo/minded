/* @refresh reload */
import { createSignal, JSX, onMount } from "solid-js";
import { Question } from "@src/shared/components/Question";
import { updateSyncData } from '@src/shared/data/dataInterface';

export const ContentScriptMain: () => JSX.Element = () => {
  const [getIsQuestionHidden, setIsQuestionHidden] = createSignal(false);

  onMount(() => {
    setTimeout(() => {
      updateSyncData({lastBlocked: Date.now(), lastBlockedUrl: window.location.href});
    }, 8000);
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

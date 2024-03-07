/* @refresh reload */
import { JSX, onMount } from "solid-js";
import { updateSyncData } from '@src/shared/data/dataInterface';
import { Interaction } from '@src/shared/components/interaction/Interaction';

export const ContentScriptMain: () => JSX.Element = () => {
  console.log(document.getElementById('minded-6622'));

  onMount(() => {
    setTimeout(() => {
      updateSyncData({lastBlocked: Date.now(), lastBlockedUrl: window.location.href});
    }, 8000);
  });

  // return <div style="width: 100%; height: 100vh; position: fixed; left: 0; right: 0; top: 0; background: white;">
  //   <div>
  //     <Question onSuccess={() => setIsAllHidden(true)} />
  //     <Dashboard />
  //   </div>
  // </div>;

  return (
    <>
      {<Interaction onHideAll={() => document.getElementById('minded-6622').remove()} />}
    </>
  );
};

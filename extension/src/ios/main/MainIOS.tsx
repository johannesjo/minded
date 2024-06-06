import RoutesCmp from "@src/shared/RouteCmp";
import { onMount } from "solid-js";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import {
  addWrapperClasses,
  setIsDarkModeIfApplies,
} from "@src/shared/addWrapperClasses";
import { IOS_EV_RESUME } from "@src/dataInterface/ios/iosInterface";

const MainIOS = () => {
  onMount(() => {
    addWrapperClasses();
  });

  const refresh = () => {
    setIsDarkModeIfApplies();

    // getSyncData().then((syncData: SyncData) => {});
  };

  onMount(() => {
    refresh();

    window.addEventListener(IOS_EV_RESUME, () => {
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
      refresh();
    });
  });

  return (
    <>
      <RoutesCmp></RoutesCmp>
    </>
  );
};

export default MainIOS;

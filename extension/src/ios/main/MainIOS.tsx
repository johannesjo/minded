import RoutesCmp from "@src/shared/RouteCmp";
import { createSignal, onMount } from "solid-js";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import {
  addWrapperClasses,
  setIsDarkModeIfApplies,
} from "@src/shared/addWrapperClasses";
import {
  IOS_DID_BECOME_ACTIVE,
  IOS_DID_ENTER_BACKGROUND,
  IOS_EV_RESUME,
  IOS_WILL_ENTER_FOREGROUND,
} from "@src/dataInterface/ios/iosInterface";
import { MindedIOSPlugin } from "@src/ios/plugin/MindedIOSPlugin";

const MainIOS = () => {
  // NOTE: we start with false, since events might have been triggered before app start
  const [getIsHide, setIsHide] = createSignal<boolean>(false);

  onMount(() => {
    addWrapperClasses();
    MindedIOSPlugin.continueToApp();
    console.log(MindedIOSPlugin);
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

    window.addEventListener(IOS_DID_BECOME_ACTIVE, () => {
      setIsHide(false);
    });
    window.addEventListener(IOS_WILL_ENTER_FOREGROUND, () => {
      setIsHide(false);
    });
    window.addEventListener(IOS_DID_ENTER_BACKGROUND, () => {
      setIsHide(true);
    });
  });

  return (
    <>
      {getIsHide() ? (
        <div id="minded-6622-coloured-wrapper" />
      ) : (
        <RoutesCmp></RoutesCmp>
      )}
    </>
  );
};

export default MainIOS;

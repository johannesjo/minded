// @ts-ignore
import styles from "./MainAndroid.module.scss";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
import RoutesCmp from "@src/shared/RouteCmp";
import { onMount } from "solid-js";
import { ANDROID_EV_RESUME } from "@src/dataInterface/android/androidInterface";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";

const MainAndroid = () => {
  onMount(() => {
    window.addEventListener(ANDROID_EV_RESUME, () => {
      window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
    });
  });

  return <RoutesCmp />;
};

export default MainAndroid;

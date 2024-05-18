// @ts-ignore
import styles from "./Settings.module.scss";
import { onMount } from "solid-js";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import { goMain } from "@src/dataInterface/android/system";

const Settings = () => {
  onMount(() => {
    addDayTimeDependentClass();

    getSyncData().then((syncData) => {});
  });

  // return (<Rating />);
  // return (<Question isUnskippable={true} onSuccessSunTap={()=> undefined} />)

  return (
    <div id="minded-6622-coloured-wrapper" class={styles.NewTab}>
      <button onclick={goMain}>MAAAIn</button>
      SETTINGS ANDROID
    </div>
  );
};

export default Settings;

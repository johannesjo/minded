import { SettingsAndroid } from "./SettingsAndroid";
import styles from "./SettingsAndroidRoute.module.scss";

/**
 * The full app picker, one level under settings. Every tap saves; the bottom
 * bar's arrow (and Android's hardware back) return to /settings.
 */
export const SettingsAppsAndroidRoute = () => (
  <div class={`pageTransitionIn pageWrapper ${styles.SettingsAndroidRoute}`}>
    <SettingsAndroid autoSave={true} />
  </div>
);

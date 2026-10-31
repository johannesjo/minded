import { Checkbox } from "@src/shared/components/ui/Checkbox";
import styles from "./SettingsAndroid.module.scss";

/** One app in a picker list: the whole row toggles it. */
export const AppRow = (props: {
  name: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <div class={styles.appEntry} onClick={() => props.onToggle()}>
    <div class={styles.checkboxDisplay}>
      <Checkbox checked={props.checked} onChange={() => {}} />
    </div>
    <span class={styles.appName}>{props.name}</span>
  </div>
);

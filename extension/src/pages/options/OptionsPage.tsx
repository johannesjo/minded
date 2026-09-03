import { onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import Options from "@pages/options/Options";
import styles from "./Options.module.scss";

const OptionsPage = () => {
  onMount(() => {
    addWrapperClasses();
  });

  return (
    <div id="minded-6622-coloured-wrapper">
      <main class={styles.scrollHost}>
        <Options />
      </main>
    </div>
  );
};

export default OptionsPage;

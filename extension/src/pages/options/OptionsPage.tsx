import { onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import Options from "@pages/options/Options";

const OptionsPage = () => {
  onMount(() => {
    addWrapperClasses();
  });

  return (
    <div id="minded-6622-coloured-wrapper">
      <Options />
    </div>
  );
};

export default OptionsPage;

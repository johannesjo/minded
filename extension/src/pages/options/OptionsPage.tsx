import { onMount } from "solid-js";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import Options from "@pages/options/Options";

const OptionsPage = () => {
  onMount(() => {
    addDayTimeDependentClass();
  });

  return (
    <div id="minded-6622-coloured-wrapper">
      <Options />
    </div>
  );
};

export default OptionsPage;

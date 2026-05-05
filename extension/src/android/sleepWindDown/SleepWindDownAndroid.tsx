import { JSX, onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import {
  SleepWindDownView,
  SleepWindDownDismissReason,
} from "@src/shared/components/sleepWindDown/SleepWindDownView";

const SleepWindDownAndroid = (): JSX.Element => {
  onMount(() => {
    addWrapperClasses();
  });

  // Snooze means "leave me alone for 30 min" — keep the user in the blocked
  // app. Skip / done end the wind-down for the night and bounce the user back
  // to minded so they don't sit on the blocked app with the overlay torn down.
  const onDismiss = (reason: SleepWindDownDismissReason) => {
    if (reason === "snooze") {
      androidInterface.hideWindow();
    } else {
      androidInterface.closeCurrentApp();
    }
  };

  return (
    <div id="minded-6622-coloured-wrapper-dynamic">
      <SleepWindDownView onDismiss={onDismiss} />
    </div>
  );
};

export default SleepWindDownAndroid;

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
  // app. Skip closes the overlay and bounces back to minded. Done means the
  // user completed the wind-down gesture (drag/fling the moon down) — at
  // that point they're going to bed, so close the overlay and lock the
  // screen so the phone is dark when they put it down.
  const onDismiss = (reason: SleepWindDownDismissReason) => {
    if (reason === "snooze") {
      androidInterface.hideWindow();
      return;
    }
    androidInterface.closeCurrentApp();
    if (reason === "done") {
      androidInterface.lockScreen();
    }
  };

  return (
    <div id="minded-6622-coloured-wrapper-dynamic">
      <SleepWindDownView onDismiss={onDismiss} />
    </div>
  );
};

export default SleepWindDownAndroid;

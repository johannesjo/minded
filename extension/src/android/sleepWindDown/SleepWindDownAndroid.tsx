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

  // All exit paths (skip / snooze / done) hand the user back to a non-blocked
  // surface. closeCurrentApp goes to minded itself first and then hides the
  // overlay so the user doesn't briefly see the blocked app underneath.
  const onDismiss = (_reason: SleepWindDownDismissReason) => {
    androidInterface.closeCurrentApp();
  };

  return (
    <div id="minded-6622-coloured-wrapper-dynamic">
      <SleepWindDownView onDismiss={onDismiss} />
    </div>
  );
};

export default SleepWindDownAndroid;

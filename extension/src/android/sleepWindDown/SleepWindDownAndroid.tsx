import { JSX, onMount } from "solid-js";
import { addWrapperClasses } from "@src/shared/addWrapperClasses";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import {
  SleepWindDownView,
  SleepWindDownDismissReason,
} from "@src/shared/components/sleepWindDown/SleepWindDownView";
import { SNOOZE_MINUTES } from "@src/shared/components/sleepWindDown/sleepWindDown.util";

const SleepWindDownAndroid = (): JSX.Element => {
  onMount(() => {
    addWrapperClasses();
  });

  // Snooze starts a normal timed session and keeps the user in the blocked
  // app with the little sun countdown visible. Skip closes the overlay and
  // bounces back to minded. Done means the user completed the wind-down
  // gesture (drag/fling the moon down) — at that point they're going to bed,
  // so close the overlay and lock the screen so the phone is dark when they
  // put it down.
  const onDismiss = (
    reason: SleepWindDownDismissReason,
    snoozeMinutes?: number,
  ) => {
    if (reason === "snooze") {
      // The view already awaited a write of `sleepWindDownSnoozeUntilTS` to the
      // shared blob before dismissing, and the Kotlin side treats that
      // timestamp as authoritative (it keeps any future deadline as-is). These
      // seconds are only the fallback Kotlin uses if no future deadline is
      // stored yet — keep them in sync with the chosen duration so the two
      // never diverge.
      androidInterface.snoozeWindDown((snoozeMinutes ?? SNOOZE_MINUTES) * 60);
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

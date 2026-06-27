import { fadeOut } from "@src/util/animation";

export type SleepWindDownDismissReason = "skip" | "snooze" | "done";

export const SLEEP_WIND_DOWN_EXIT_FADE_MS = 300;

type FadeOut = (
  el: HTMLElement,
  duration?: number,
) => { promise: Promise<void> };

export const createSleepWindDownDismissTransition = (opts: {
  getWrapperEl: () => HTMLElement | undefined;
  onDismiss: (reason: SleepWindDownDismissReason, snoozeMinutes?: number) => void;
  fade?: FadeOut;
  duration?: number;
}): ((
  reason: SleepWindDownDismissReason,
  snoozeMinutes?: number,
) => Promise<void>) => {
  const fade = opts.fade ?? fadeOut;
  const duration = opts.duration ?? SLEEP_WIND_DOWN_EXIT_FADE_MS;
  let isDismissing = false;

  return async (reason, snoozeMinutes) => {
    if (isDismissing) return;
    isDismissing = true;

    const wrapperEl = opts.getWrapperEl();

    try {
      if (wrapperEl) {
        wrapperEl.style.animation = "none";
        await fade(wrapperEl, duration).promise;
      }
    } finally {
      opts.onDismiss(reason, snoozeMinutes);
    }
  };
};

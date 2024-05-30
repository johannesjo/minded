// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { IS_MOUSE_PRIMARY, IS_TOUCH_PRIMARY } from "@src/util/touch";

const DARK_MODE_START_HOUR = 19;
const DARK_MODE_END_HOUR = 6;

export const addWrapperClasses = () => {
  const el = document.getElementById("minded-6622");

  setIsDarkModeIfApplies(el);

  if (IS_ANDROID) {
    el.classList.add("minded-6622-android");
  }
  if (IS_TOUCH_PRIMARY) {
    el.classList.add("minded-6622-touch-primary");
  }
  if (IS_MOUSE_PRIMARY) {
    el.classList.add("minded-6622-mouse-primary");
  }
};

export const isDarkModeNow = (): boolean => {
  // return true;
  const now = new Date();
  const nowHours = now.getHours();

  return nowHours >= DARK_MODE_START_HOUR || nowHours < DARK_MODE_END_HOUR;
};

export const setIsDarkModeIfApplies = (
  el = document.getElementById("minded-6622"),
) => {
  if (isDarkModeNow()) {
    el.classList.add("minded-6622-dark");
  } else {
    el.classList.remove("minded-6622-dark");
  }
};

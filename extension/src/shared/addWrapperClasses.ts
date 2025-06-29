import { IS_MOUSE_PRIMARY, IS_TOUCH_PRIMARY } from "@src/util/touch";
import { IS_APP, IS_WEB_EXT } from "@src/dataInterface/commonSyncDataInterface";

// const DARK_MODE_START_HOUR = 11;
const DARK_MODE_START_HOUR = 19;
const DARK_MODE_END_HOUR = 6;

export const addWrapperClasses = () => {
  const el = document.getElementById("minded-6622");
  if (!el) {
    console.error("minded-6622 wrapper element not found");
    return;
  }

  setIsDarkModeIfApplies(el);

  if (IS_APP) {
    el.classList.add("minded-6622-mobile-app");
  }
  if (IS_WEB_EXT) {
    el.classList.add("minded-6622-web-extension");
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
  el: HTMLElement | null = document.getElementById("minded-6622"),
) => {
  if (!el) {
    console.error("Element not found for dark mode application");
    return;
  }

  if (isDarkModeNow()) {
    el.classList.add("minded-6622-dark");
  } else {
    el.classList.remove("minded-6622-dark");
  }
  // el.classList.add("minded-6622-dark");
};

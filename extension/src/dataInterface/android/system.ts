import { androidInterface } from "@src/dataInterface/android/androidInterface";

export const IS_ANDROID = true;
export const IS_IOS = false;
export const IS_APP = true;
export const IS_WEB_EXT = false;

export const requestFocusAndShowKeyboard = () => {
  androidInterface.requestFocusAndShowKeyboard();
};

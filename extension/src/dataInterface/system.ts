// This file re-exports from platform-specific system modules
// The actual implementation will be aliased at build time

export const IS_ANDROID = false;
export const IS_IOS = false;
export const IS_APP = false;
export const IS_WEB_EXT = true;

export const requestFocusAndShowKeyboard = () => {
  // Default implementation - platform-specific files will override
};

const DARK_MODE_START_HOUR = 19;
const DARK_MODE_END_HOUR = 6;

export const addDayTimeDependentClass = () => {
  if (isDarkModeNow()) {
    document.getElementById("minded-6622").classList.add("minded-6622-dark");
  }
};

export const isDarkModeNow = (): boolean => {
  // return true;
  const now = new Date();
  const nowHours = now.getHours();

  return nowHours >= DARK_MODE_START_HOUR || nowHours < DARK_MODE_END_HOUR;
};

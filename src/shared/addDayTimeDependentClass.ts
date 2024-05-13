const DARK_MODE_START_HOUR = 19;
const DARK_MODE_END_HOUR = 6;

export const addDayTimeDependentClass = () => {
  const now = new Date();
  const nowHours = now.getHours();

  if (nowHours >= DARK_MODE_START_HOUR || nowHours < DARK_MODE_END_HOUR) {
    document.getElementById("minded-6622").classList.add("minded-6622-dark");
  }
};

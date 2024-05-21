export const isToday = (date: number | Date): boolean => {
  const d = new Date(date);
  const isValid = d.getTime() > 0;
  // if (!isValid) {
  //   throw new Error("Invalid date passed " + date);
  // }
  const today = new Date();
  // return (today.toDateString() === d.toDateString());
  // return  today.setHours(0, 0, 0, 0) === d.setHours(0, 0, 0, 0);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export const isYesterday = (date: number): boolean => {
  const d = new Date(date);
  const isValid = d.getTime() > 0;
  if (!isValid) {
    throw new Error("Invalid date passed");
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // return (yesterday.toDateString() === d.toDateString());
  // return  yesterday.setHours(0, 0, 0, 0) === d.setHours(0, 0, 0, 0);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

export const hasHappenedInLastXDay = (
  date: number,
  daysAgo: number,
): boolean => {
  const now = new Date();
  const xDaysAgo = new Date(now.setDate(now.getDate() - daysAgo));
  return new Date(date) >= xDaysAgo;
};

const getWeekNumber = (d: Date): number => {
  const start = new Date(d.getFullYear(), 0, 1);
  const dayOfYear =
    (d.getTime() - start.getTime() + /* ms per day = */ 86400000) / 86400000;
  return Math.ceil((dayOfYear - d.getDay() + 1) / 7);
};

export const isThisWeek = (date: number | Date): boolean => {
  const d = new Date(date);
  const isValid = d.getTime() > 0;
  if (!isValid) {
    throw new Error("Invalid date passed");
  }
  const today = new Date();
  return getWeekNumber(d) === getWeekNumber(today);
};

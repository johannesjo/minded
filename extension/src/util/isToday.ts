export const isToday = (date: number | Date): boolean => {
  const d = new Date(date);
  const today = new Date();
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

export const isThisWeek = (date: number | Date): boolean => {
  const d = new Date(date);
  const isValid = d.getTime() > 0;
  if (!isValid) {
    throw new Error("Invalid date passed");
  }
  const today = new Date();
  // Get Monday of current week (Monday = start of week)
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  // Get next Monday
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  return d >= monday && d < nextMonday;
};

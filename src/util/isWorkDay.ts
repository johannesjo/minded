export const isWorkDay = (date: Date = new Date()): Boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
};

export const getIsoDate = (date = new Date()) => {
  return date.toISOString().substring(0, 10);
};

export const getRndEntry = <T>(arr: T[]): T => {
  const rndIndex = Math.floor(Math.random() * arr.length);
  return arr[rndIndex];
};

export const getRndIndex = <T>(arr: T[]): number => {
  return Math.floor(Math.random() * arr.length);
};

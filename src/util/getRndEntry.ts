export const getRndEntry = <T>(arr: T[]): T => {
  const rndIndex = Math.floor(Math.random() * arr.length);
  return arr[rndIndex];
};

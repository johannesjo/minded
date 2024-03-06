export const getRndEntries = <T>(arr: T[], count: number): T[] => {
  let result = [];
  const copy = [...arr];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    const rndIndex = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(rndIndex, 1)[0]);
  }
  return result;
};

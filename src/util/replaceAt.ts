export function replaceAt<T>(arr: T[], index: number, value: T): T[] {
  const newArray = [...arr];
  newArray[index] = value;
  return newArray;
}

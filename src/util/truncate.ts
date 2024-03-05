export const truncate = (str: string, maxLength: number): string => {
  if (str && str.length > maxLength) {
    return str.substring(0, maxLength - 1) + "…";
  }
  return str;
};

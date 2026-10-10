export const sanitizeDigits = (value: string) =>
  value.replace(/[^0-9]/g, "");


export const parseParam = (value?: string | string[]): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};
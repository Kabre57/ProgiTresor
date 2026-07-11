/**
 * Safely parse date strings. Returns undefined if the string is empty or invalid.
 */
export const parseSafeDate = (value: string | undefined | null): Date | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d;
};

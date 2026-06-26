export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
  && !(value instanceof Date)
);

export const toJsonSafe = (value: unknown): JsonValue => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (isRecord(value)) {
    return Object.entries(value).reduce<Record<string, JsonValue>>((accumulator, [key, nestedValue]) => {
      accumulator[key] = toJsonSafe(nestedValue);
      return accumulator;
    }, {});
  }

  if (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value === null
  ) {
    return value;
  }

  return null;
};

export const normalizeImportLabel = (value: unknown): string => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toUpperCase().replace(/[’`]/g, "'").replace(/[\s_-]+/g, ' ');

export const findImportColumn = (keys: string[], ...names: string[]): string | undefined => {
  const normalize = (value: string) => normalizeImportLabel(value).replace(/[^A-Z0-9]/g, '');
  for (const name of names) {
    const match = keys.find(key => normalize(key) === normalize(name));
    if (match) return match;
  }
  return undefined;
};

/** Les codes métier sont prioritaires ; les libellés ne sont jamais choisis au hasard. */
export const findImportReferences = <T>(
  value: string, items: T[], codes: (item: T) => unknown[], labels: (item: T) => unknown[],
): T[] => {
  const normalized = normalizeImportLabel(value);
  if (!normalized) return [];
  const matches = (values: unknown[]) => values.some(candidate => normalizeImportLabel(candidate) === normalized);
  const byCode = items.filter(item => matches(codes(item)));
  return byCode.length ? byCode : items.filter(item => matches(labels(item)));
};

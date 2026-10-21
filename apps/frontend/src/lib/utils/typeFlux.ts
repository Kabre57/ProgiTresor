/** Les imports historiques emploient des tirets, espaces ou underscores. */
export const normalizeTypeFluxCode = (code?: string | null): string =>
  (code ?? '').trim().toUpperCase().replace(/[\s_\-\u2010-\u2015]+/g, '_');

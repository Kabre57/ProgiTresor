export type FluxKind = 'budget' | 'hors-budget' | 'unknown';

export type FluxLike = {
  id?: number | null;
  code?: string | null;
  libelle?: string | null;
};

export type FluxMeta = {
  id?: number | null;
  code?: string | null;
  libelle?: string | null;
  label: string;
  kind: FluxKind;
};

const normalize = (value: unknown): string => String(value ?? '')
  .trim()
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

export const resolveFluxKind = (flux?: FluxLike | null, id?: number | null): FluxKind => {
  const code = normalize(flux?.code);
  const libelle = normalize(flux?.libelle);
  const label = `${code} ${libelle}`.trim();

  if (code === 'HORS BUDGET' || label.includes('HORS BUDGET') || id === 2 || id === 8) {
    return 'hors-budget';
  }
  if (code === 'BUDGET' || label.includes(' BUDGET') || label === 'BUDGET' || id === 1 || id === 7) {
    return 'budget';
  }
  return 'unknown';
};

export const buildFluxMeta = (flux?: FluxLike | null, fallbackId?: number | null): FluxMeta => {
  const id = flux?.id ?? fallbackId ?? null;
  const label = flux?.libelle || flux?.code || (id ? `Flux #${id}` : 'Non classifié');
  const kind = resolveFluxKind(flux, id);
  return {
    id,
    code: flux?.code ?? (kind === 'budget' ? 'BUDGET' : kind === 'hors-budget' ? 'HORS_BUDGET' : null),
    libelle: flux?.libelle ?? (kind === 'budget' ? 'BUDGET' : kind === 'hors-budget' ? 'HORS BUDGET' : null),
    label,
    kind,
  };
};


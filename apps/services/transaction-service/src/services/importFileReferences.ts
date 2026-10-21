import { findImportReferences } from '../../../../../shared/utils/importReferences';
import { fetchEtudiantResult } from '../utils/etudiantServiceClient';
import { AppError } from '../utils/errors';
import type { ParsedTransactionItem } from './importParserService';

type Reference = { id: number; code?: string; codeProduit?: string; nom?: string; libelle?: string; typeFluxId?: number; typeRecette?: { code: string; libelle: string; typeFluxId: number } };

export async function resolveImportFileReferences(items: ParsedTransactionItem[]): Promise<void> {
  const load = async (needed: boolean, endpoint: string): Promise<Reference[]> => {
    if (!needed) return [];
    const result = await fetchEtudiantResult<Reference[]>(endpoint, undefined, []);
    if (!result.ok) throw new AppError(503, 'Les référentiels sont momentanément indisponibles. Réessayez l’import.');
    return result.data;
  };
  const [antennes, nomenclatures, recettes, flux] = await Promise.all([
    load(items.some(item => !!item.antenne), '/antennes'),
    load(items.some(item => !!item.nomenclature), '/nomenclatures'),
    load(items.some(item => !!item.typeRecette), '/types-recettes'),
    load(items.some(item => !!item.typeFlux), '/types-flux'),
  ]);
  for (const [index, item] of items.entries()) {
    const resolve = (field: string, value: string, references: Reference[]): Reference => {
      const matches = findImportReferences(value, references, r => [r.code, r.codeProduit], r => [r.nom, r.libelle]);
      if (matches.length !== 1) {
        throw new AppError(400, `Ligne ${index + 2} : ${field} « ${value} » ${matches.length ? 'ambigu ; préciser son code métier' : 'introuvable dans les référentiels'}.`);
      }
      return matches[0];
    };
    if (item.antenne) item.antenneId = resolve('Antenne', item.antenne, antennes).id;
    const selectedFlux = item.typeFlux ? resolve('Flux', item.typeFlux, flux) : undefined;
    const selectedRecette = item.typeRecette ? resolve('Type de recette', item.typeRecette,
      selectedFlux ? recettes.filter(reference => reference.typeFluxId === selectedFlux.id) : recettes,
    ) : undefined;
    if (selectedFlux && selectedRecette && selectedRecette.typeFluxId !== selectedFlux.id) {
      throw new AppError(400, `Ligne ${index + 2} : le type de recette n’appartient pas au flux indiqué.`);
    }
    if (selectedFlux) item.typeFluxId = selectedFlux.id;
    if (selectedRecette) {
      item.typeRecette = selectedRecette.libelle || selectedRecette.code || item.typeRecette;
      item.typeFluxId = selectedRecette.typeFluxId;
    }
    if (item.nomenclature) {
      const candidates = nomenclatures.filter(reference =>
        (!item.typeFluxId || reference.typeRecette?.typeFluxId === item.typeFluxId)
        && (!selectedRecette || reference.typeRecette?.code === selectedRecette.code));
      const selected = resolve('Nomenclature', item.nomenclature, candidates);
      item.nomenclatureId = selected.id;
      item.typeFluxId = selected.typeRecette?.typeFluxId ?? item.typeFluxId;
      if (!item.libelleProduitBrut) item.libelleProduitBrut = selected.libelle || selected.codeProduit || null;
    }
  }
}

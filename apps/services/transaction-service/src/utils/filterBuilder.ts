import { Prisma } from '@prisma/client/index';
import logger from './logger';
import { fetchEtudiantJson } from './etudiantServiceClient';

const isPresent = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string' && (val.trim() === '' || val.trim() === '0')) return false;
  if (typeof val === 'number' && val === 0) return false;
  return true;
};

const parseMultiSelect = (val: any): number[] | undefined => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) {
    const arr = val.map(v => parseInt(String(v), 10)).filter(n => !isNaN(n));
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof val === 'string') {
    if (val.trim() === '' || val.trim() === '0') return undefined;
    const arr = val.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof val === 'number') {
    if (val === 0) return undefined;
    return [val];
  }
  return undefined;
};

export const buildTransactionWhereClause = async (query: any): Promise<Prisma.TransactionWhereInput> => {
  const where: Prisma.TransactionWhereInput = {};

  const {
    dateDebut,
    dateFin,
    etudiantMatricule,
    etudiantNom,
    antenneId,
    filiereId,
    statutId,
    typeFluxId,
    typeRecetteId,
    nomenclatureId,
    libelleProduit,
    promotion,
    promotionId,
  } = query;

  // 1. Date Filter
  if (isPresent(dateDebut) || isPresent(dateFin)) {
    where.dateHeure = {};
    if (isPresent(dateDebut)) {
      where.dateHeure.gte = new Date(dateDebut as string);
    }
    if (isPresent(dateFin)) {
      where.dateHeure.lte = new Date(dateFin as string);
    }
  }

  // Parse Multi-Select Fields
  const parsedTypeFluxIds = parseMultiSelect(typeFluxId);
  const parsedNomenclatureIds = parseMultiSelect(nomenclatureId);
  const parsedTypeRecetteIds = parseMultiSelect(typeRecetteId);
  const parsedAntenneIds = parseMultiSelect(antenneId);
  const parsedFiliereIds = parseMultiSelect(filiereId ?? query.niveauId);
  const parsedStatutIds = parseMultiSelect(statutId);

  // 2. Direct simple filters
  if (parsedTypeFluxIds) {
    where.typeFluxId = { in: parsedTypeFluxIds };
  }

  if (parsedNomenclatureIds) {
    where.nomenclatureId = { in: parsedNomenclatureIds };
  }

  if (isPresent(libelleProduit)) {
    where.libelleProduitBrut = {
      contains: String(libelleProduit),
      mode: 'insensitive',
    };
  }



  // 3. Etudiant Service Filter Composition
  const hasEtudiantFilters =
    isPresent(etudiantMatricule) ||
    isPresent(etudiantNom) ||
    isPresent(promotion) ||
    isPresent(promotionId) ||
    parsedAntenneIds !== undefined ||
    parsedFiliereIds !== undefined ||
    parsedStatutIds !== undefined;

  if (hasEtudiantFilters) {
    let etudiantSearch: string | undefined = undefined;
    if (isPresent(etudiantMatricule)) {
      etudiantSearch = etudiantMatricule as string;
    } else if (isPresent(etudiantNom)) {
      etudiantSearch = etudiantNom as string;
    }

    const params = new URLSearchParams();
    if (etudiantSearch) params.append('search', etudiantSearch);
    if (parsedAntenneIds) params.append('antenneId', parsedAntenneIds.join(','));
    if (parsedFiliereIds) params.append('filiereId', parsedFiliereIds.join(','));
    if (parsedStatutIds) params.append('statutId', parsedStatutIds.join(','));
    if (isPresent(promotion)) params.append('promotion', String(promotion));
    if (isPresent(promotionId)) params.append('promotionId', String(promotionId));

    try {
      const etudiant = await fetchEtudiantJson<any[]>(`/?${params.toString()}`, undefined, []);
      if (Array.isArray(etudiant)) {
        const etudiantIds = etudiant.map((s) => s.id);
        where.etudiantId = { in: etudiantIds };
      } else {
        where.etudiantId = { in: [] };
      }
    } catch (err) {
      logger.warn(err, 'Failed to query etudiant-service for transaction filtering');
      where.etudiantId = { in: [] };
    }
  }

  // 4. Nomenclature / Type Recette resolution
  if (parsedTypeRecetteIds && !parsedNomenclatureIds) {
    try {
      const noms = await fetchEtudiantJson<any[]>('/nomenclatures', undefined, []);
      if (Array.isArray(noms)) {
        const matchingNoms = noms.filter((nom) => {
          const trId = nom.typeRecetteId || nom.typeRecette?.id;
          return parsedTypeRecetteIds.includes(trId);
        });
        const nomenclatureIds = matchingNoms.map((nom) => nom.id);
        where.nomenclatureId = { in: nomenclatureIds };
      } else {
        where.nomenclatureId = { in: [] };
      }
    } catch (err) {
      logger.warn(err, 'Failed to fetch nomenclatures for typeRecette filtering');
      where.nomenclatureId = { in: [] };
    }
  }

  return where;
};

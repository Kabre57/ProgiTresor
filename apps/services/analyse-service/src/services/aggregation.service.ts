import { http, ETUDIANT_SERVICE_URL, TRANSACTION_SERVICE_URL, ORDER_SERVICE_URL } from '../utils/httpClient';
import logger from '../utils/logger';

const normalizeAndSortWords = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ieme/g, 'eme')
    .replace(/1er/g, '1')
    .replace(/1ere/g, '1')
    .replace(/2eme/g, '2')
    .replace(/3eme/g, '3')
    .replace(/l1/g, 'licence1')
    .replace(/l2/g, 'licence2')
    .replace(/l3/g, 'licence3')
    .replace(/d'/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w !== '' && w !== 'frais' && w !== 'de' && w !== 'du' && w !== 'des')
    .sort()
    .join(' ');
};

type RawTransaction = {
  id: number | string;
  montant: number | string;
  dateHeure?: string;
  antenneId: number | null;
  etudiantId: number | null;
  nomenclatureId: number | null;
  typeFluxId: number | null;
  libelleProduitBrut?: string | null;
};

type Antenne = {
  id: number;
  code?: string;
  nom?: string;
};

type Filiere = {
  id: number;
  code?: string;
  libelle?: string;
};

type StatutEtudiant = {
  id: number;
  code: string;
  libelle: string;
};

type Etudiant = {
  id: number;
  antenneId: number;
  filiereId: number;
  statutId: number;
};

type Nomenclature = {
  id: number;
  libelle?: string;
  libelleStandard?: string;
  niveauId?: number | null;
  filiereId?: number | null;
  typeRecetteId?: number;
  typeRecette?: {
    id: number;
    code?: string;
    libelle?: string;
    typeFluxId?: number;
    typeFlux?: { libelle?: string };
  };
};

export type SynthesisFilters = {
  dateDebut?: string;
  dateFin?: string;
  antenneId?: number;
  filiereId?: number;
  typeRecetteId?: number;
};

export type SynthesisLine = {
  codeOt: string;
  antenneId: number;
  antenneCode: string;
  antenneLibelle: string;
  filiereId: number;
  filiereCode: string;
  filiereLibelle: string;
  statutId: number;
  statutLibelle: string;
  typeRecetteId: number;
  typeRecetteLibelle: string;
  montantCumule: number;
  nombreFlux: number;
  transactionIds: number[];
};

const fetchArray = async <T>(url: string, fallback: T[] = []): Promise<T[]> => {
  try {
    const response = await http.get<T[]>(url);
    return Array.isArray(response.data) ? response.data : fallback;
  } catch (err) {
    logger.warn({ err, url }, 'Failed to fetch analyse referential');
    return fallback;
  }
};

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const inPeriod = (tx: RawTransaction, filters: SynthesisFilters) => {
  if (!filters.dateDebut && !filters.dateFin) return true;
  if (!tx.dateHeure) return true;

  const date = new Date(tx.dateHeure).getTime();
  if (filters.dateDebut && date < new Date(filters.dateDebut).getTime()) return false;
  if (filters.dateFin && date > new Date(filters.dateFin).getTime()) return false;
  return true;
};

const buildMaps = async (transactions: RawTransaction[]) => {
  const etudiantIds = Array.from(
    new Set(transactions.map((tx) => tx.etudiantId).filter((id): id is number => id !== null)),
  );

  const [antennes, filieres, nomenclatures, statuts] = await Promise.all([
    fetchArray<Antenne>(`${ETUDIANT_SERVICE_URL}/antennes`),
    fetchArray<Filiere>(`${ETUDIANT_SERVICE_URL}/filieres`),
    fetchArray<Nomenclature>(`${ETUDIANT_SERVICE_URL}/nomenclatures`),
    fetchArray<StatutEtudiant>(`${ETUDIANT_SERVICE_URL}/statuts-etudiants`),
  ]);

  let etudiants: Etudiant[] = [];
  if (etudiantIds.length > 0) {
    const chunks = chunkArray(etudiantIds, 1000);
    for (const ids of chunks) {
      try {
        const response = await http.post<Etudiant[]>(`${ETUDIANT_SERVICE_URL}/batch-ids`, { ids });
        if (Array.isArray(response.data)) {
          etudiants.push(...response.data);
        }
      } catch (err) {
        logger.warn({ err, count: ids.length }, 'Failed to resolve etudiants chunk for synthesis');
      }
    }
  }

  return {
    antennes: new Map(antennes.map((item) => [item.id, item])),
    filieres: new Map(filieres.map((item) => [item.id, item])),
    nomenclatures: new Map(nomenclatures.map((item) => [item.id, item])),
    etudiants: new Map(etudiants.map((item) => [item.id, item])),
    statuts: new Map(statuts.map((item) => [item.id, item])),
  };
};

export const aggregateSynthesis = async (filters: SynthesisFilters = {}): Promise<SynthesisLine[]> => {
  const params: any = {};
  if (filters.dateDebut) params.dateDebut = filters.dateDebut;
  if (filters.dateFin) params.dateFin = filters.dateFin;

  const response = await http.get<RawTransaction[]>(`${TRANSACTION_SERVICE_URL}/unassigned`, { params });
  const transactions = (Array.isArray(response.data) ? response.data : [])
    .filter((tx) => inPeriod(tx, filters));

  const maps = await buildMaps(transactions);
  const groups = new Map<string, SynthesisLine>();
  const currentDate = new Date();
  const codeDate = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
  const antennaSequence = new Map<number, number>();

  try {
    const ordersRes = await http.get<any[]>(`${ORDER_SERVICE_URL}/`);
    if (ordersRes && Array.isArray(ordersRes.data)) {
      const prefix = `OT-${codeDate}-`;
      for (const order of ordersRes.data) {
        if (order.codeOt && order.codeOt.startsWith(prefix)) {
          const parts = order.codeOt.split('-');
          if (parts.length >= 4) {
            const antenneCode = parts[2];
            const seqNum = parseInt(parts[3], 10);
            if (!isNaN(seqNum)) {
              let antenneId: number | undefined;
              for (const [id, ant] of maps.antennes.entries()) {
                if (ant.code && ant.code.toUpperCase() === antenneCode.toUpperCase()) {
                  antenneId = id;
                  break;
                }
              }
              if (antenneId !== undefined) {
                const currentMax = antennaSequence.get(antenneId) ?? 0;
                if (seqNum > currentMax) {
                  antennaSequence.set(antenneId, seqNum);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch existing orders from order-service to offset sequences');
  }

  const nomByLibelleMap = new Map<string, Nomenclature>();
  for (const nom of maps.nomenclatures.values()) {
    if (nom.libelle) {
      nomByLibelleMap.set(nom.libelle.trim().toUpperCase(), nom);
      nomByLibelleMap.set(normalizeAndSortWords(nom.libelle), nom);
    }
  }

  for (const tx of transactions) {
    const etudiant = tx.etudiantId ? maps.etudiants.get(tx.etudiantId) : undefined;
    let nomenclature = tx.nomenclatureId ? maps.nomenclatures.get(tx.nomenclatureId) : undefined;
    if (!nomenclature && tx.libelleProduitBrut) {
      nomenclature = nomByLibelleMap.get(tx.libelleProduitBrut.trim().toUpperCase()) ||
                     nomByLibelleMap.get(normalizeAndSortWords(tx.libelleProduitBrut));
    }

    const antenneId = tx.antenneId ?? etudiant?.antenneId ?? 1;
    const filiereId = etudiant?.filiereId ?? nomenclature?.filiereId ?? nomenclature?.niveauId ?? 1;
    const statutId = etudiant?.statutId ?? 1; // 1 = Public par défaut
    const typeRecetteId = nomenclature?.typeRecetteId ?? nomenclature?.typeRecette?.id ?? tx.typeFluxId ?? 1;

    if (filters.antenneId && antenneId !== filters.antenneId) continue;
    if (filters.filiereId && filiereId !== filters.filiereId) continue;
    if (filters.typeRecetteId && typeRecetteId !== filters.typeRecetteId) continue;

    const antenne = maps.antennes.get(antenneId);
    const filiere = maps.filieres.get(filiereId);
    const statut = maps.statuts.get(statutId);
    const key = `${antenneId}:${filiereId}:${statutId}:${typeRecetteId}`;

    if (!groups.has(key)) {
      const nextSeq = (antennaSequence.get(antenneId) ?? 0) + 1;
      antennaSequence.set(antenneId, nextSeq);
      const antenneCode = (antenne?.code || `ANT${antenneId}`).toUpperCase();

      groups.set(key, {
        codeOt: `OT-${codeDate}-${antenneCode}-${String(nextSeq).padStart(3, '0')}`,
        antenneId,
        antenneCode,
        antenneLibelle: antenne?.nom ?? antenneCode,
        filiereId,
        filiereCode: filiere?.code ?? `FIL${filiereId}`,
        filiereLibelle: filiere?.libelle ?? `Filière ${filiereId}`,
        statutId,
        statutLibelle: statut?.libelle ?? (statutId === 1 ? 'Public' : 'Privé'),
        typeRecetteId,
        typeRecetteLibelle:
          nomenclature?.typeRecette?.libelle ??
          nomenclature?.libelleStandard ??
          tx.libelleProduitBrut ??
          `Type recette ${typeRecetteId}`,
        montantCumule: 0,
        nombreFlux: 0,
        transactionIds: [],
      });
    }

    const group = groups.get(key)!;
    group.montantCumule += toNumber(tx.montant);
    group.nombreFlux += 1;
    group.transactionIds.push(Number(tx.id));
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.antenneCode.localeCompare(b.antenneCode) ||
    a.filiereCode.localeCompare(b.filiereCode) ||
    a.statutLibelle.localeCompare(b.statutLibelle) ||
    a.typeRecetteLibelle.localeCompare(b.typeRecetteLibelle),
  );
};

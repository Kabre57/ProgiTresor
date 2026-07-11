import { createHash } from 'crypto';
import { Prisma } from '@prisma/client/index';
import { BordereauFromOtsInput, BordereauListQueryInput } from '../../../../../shared/types/compta.types';
import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';
import { http, TRANSACTION_SERVICE_URL } from '../utils/httpClient';
import { AppError } from '../utils/errors';
import { parseSafeDate } from '../utils/date';

type RemoteTransaction = {
  id: number | string;
  refTresor?: string | null;
  dateHeure: string;
  montant: number | string;
  ordreTraitementId?: number | null;
  codeOt?: string | null;
  libelleProduitBrut?: string | null;
  typeFrais?: string | null;
  nomenclatureId?: number | null;
  typeRecetteId?: number | null;
  antenneId?: number | null;
  etudiantId?: number | null;
  nomPayeurBrut?: string | null;
  filiere?: string | null;
  niveau?: string | null;
  versement?: string | null;
};

const includeBordereau = {
  ecritures: true,
  lots: true,
};

const buildReference = (codesOt: string[]) => {
  const digest = createHash('sha1').update([...codesOt].sort().join('|')).digest('hex').slice(0, 12).toUpperCase();
  return `BDR-${digest}`;
};

const fetchTransactionsForOt = async (codeOt: string) => {
  const response = await http.get<RemoteTransaction[]>(`${TRANSACTION_SERVICE_URL}/ot/${codeOt}/transactions`);
  return Array.isArray(response.data) ? response.data : [];
};

const toEcritureCreateInput = (
  bordereauId: number,
  codeOt: string,
  tx: RemoteTransaction,
): Prisma.EcritureBudgetaireCreateManyInput => {
  const details: Prisma.InputJsonObject = {
    etudiantId: tx.etudiantId ?? null,
    nomenclatureId: tx.nomenclatureId ?? null,
    filiere: tx.filiere ?? null,
    niveau: tx.niveau ?? null,
    versement: tx.versement ?? null,
  };

  return {
    bordereauId,
    ordreTraitementId: tx.ordreTraitementId ?? null,
    codeOt,
    transactionId: BigInt(tx.id),
    refTresor: tx.refTresor ?? null,
    produitLibelleBrut: tx.libelleProduitBrut ?? 'Flux hors budget',
    typeRecetteId: tx.typeRecetteId ?? null,
    typeRecetteLibelle: tx.typeFrais ?? null,
    antenneId: tx.antenneId ?? null,
    montant: new Prisma.Decimal(tx.montant),
    dateFlux: new Date(tx.dateHeure),
    matriculeEtudiant: null,
    detailsComplementaires: details,
    statut: 'EN_ATTENTE',
  };
};

export const createBordereauFromOts = async (input: BordereauFromOtsInput) => {
  const end = dbQueryDuration.startTimer({ operation: 'bordereau_create_from_ots' });
  try {
    const reference = buildReference(input.codesOt);
    const existing = await prisma.bordereau.findUnique({ where: { reference }, include: includeBordereau });
    if (existing) return existing;

    const rows: { codeOt: string; tx: RemoteTransaction }[] = [];
    for (const codeOt of input.codesOt) {
      const transactions = await fetchTransactionsForOt(codeOt);
      rows.push(...transactions.map((tx) => ({ codeOt, tx })));
    }

    if (rows.length === 0) {
      throw new AppError(400, 'Aucune transaction OT à intégrer dans le bordereau.');
    }

    const montantTotal = rows.reduce((sum, row) => sum + Number(row.tx.montant), 0);
    const anneeBudgetaire = new Date().getFullYear();

    return prisma.$transaction(async (txClient) => {
      const bordereau = await txClient.bordereau.create({
        data: {
          reference,
          sourceService: input.sourceService,
          anneeBudgetaire,
          utilisateurTransmission: input.utilisateurTransmission,
          montantTotal: new Prisma.Decimal(montantTotal),
          nombreOt: input.codesOt.length,
          nombreEcritures: rows.length,
        },
      });

      const ecritureData = rows.map((row) => toEcritureCreateInput(bordereau.id, row.codeOt, row.tx));
      const chunkSize = 10000;
      for (let i = 0; i < ecritureData.length; i += chunkSize) {
        const chunk = ecritureData.slice(i, i + chunkSize);
        await txClient.ecritureBudgetaire.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }

      return txClient.bordereau.findUniqueOrThrow({
        where: { id: bordereau.id },
        include: includeBordereau,
      });
    }, {
      timeout: 300000
    });
  } finally {
    end();
  }
};

export const listBordereaux = async (query: BordereauListQueryInput) => {
  const where: Prisma.BordereauWhereInput = {};
  if (query.statut) where.statut = query.statut;
  
  const dateDebut = parseSafeDate(query.dateDebut);
  const dateFin = parseSafeDate(query.dateFin);
  if (dateDebut || dateFin) {
    where.dateReception = {};
    if (dateDebut) where.dateReception.gte = dateDebut;
    if (dateFin) where.dateReception.lte = dateFin;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.bordereau.findMany({ where, orderBy: { dateReception: 'desc' }, skip, take: query.limit }),
    prisma.bordereau.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
};

export const getBordereau = async (id: number) => {
  const bordereau = await prisma.bordereau.findUnique({ where: { id }, include: includeBordereau });
  if (!bordereau) throw new AppError(404, 'Bordereau introuvable');
  return bordereau;
};

export const listEcritures = async (bordereauId: number) => {
  return prisma.ecritureBudgetaire.findMany({
    where: { bordereauId },
    orderBy: { dateFlux: 'asc' },
  });
};

export const listPendingEcritures = async (query: {
  antenneId?: number;
  typeRecetteId?: number;
  dateDebut?: string;
  dateFin?: string;
}) => {
  const where: any = { statut: 'EN_ATTENTE' };
  if (query.antenneId) where.antenneId = query.antenneId;
  if (query.typeRecetteId) where.typeRecetteId = query.typeRecetteId;
  
  const dateDebut = parseSafeDate(query.dateDebut);
  const dateFin = parseSafeDate(query.dateFin);
  if (dateDebut || dateFin) {
    where.dateFlux = {};
    if (dateDebut) where.dateFlux.gte = dateDebut;
    if (dateFin) where.dateFlux.lte = dateFin;
  }
  return prisma.ecritureBudgetaire.findMany({
    where,
    orderBy: { dateFlux: 'desc' },
  });
};


import { prisma } from '../utils/prisma';
import { dbQueryDuration } from '../utils/metrics';
import logger from '../utils/logger';
import { Prisma } from '@prisma/client/index';

export const createAccountingEntry = async (codeOt: string, montant: number) => {
  const end = dbQueryDuration.startTimer({ operation: 'create_entry' });
  try {
    // Écriture double SYSCOHADA : Débit 467 (Débiteurs Divers / Trésor Pay) et Crédit 443 (Fonds de tiers)
    const entry = await prisma.ecritureComptable.create({
      data: {
        codeOt,
        compteDebit: '467', // Débiteurs Divers
        compteCredit: '443', // État, fonds de tiers
        montant: new Prisma.Decimal(montant),
        libelle: `Règlement OT ${codeOt}`,
        statut: 'VALIDEE',
        dateValidation: new Date(),
      },
    });
    logger.info({ codeOt, entryId: entry.id }, 'Écriture comptable SYSCOHADA générée avec succès');
    return entry;
  } finally {
    end();
  }
};

export const getEntries = async () => {
  return prisma.ecritureComptable.findMany({
    orderBy: { dateCreation: 'desc' },
  });
};
export const getEntryById = async (id: string) => {
  return prisma.ecritureComptable.findUnique({
    where: { id },
  });
};

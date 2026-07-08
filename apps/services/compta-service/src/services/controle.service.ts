import { Prisma } from '@prisma/client/index';
import { ControleOpInput } from '../../../../../shared/types/compta.types';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';

export const controlerOp = async (input: ControleOpInput) => {
  const lot = await prisma.lotTraitement.findUnique({
    where: { id: input.lotTraitementId },
    include: { ecritures: true },
  });
  if (!lot) throw new AppError(404, 'Lot de traitement introuvable pour contrôle OP/OT.');

  const montantOt = Number(lot.montantTotal);
  const nombreLignesOt = lot.nombreEcritures;
  const ecart = input.montantOp - montantOt;
  const conforme = ecart === 0 && input.nombreLignesOp === nombreLignesOt;

  return prisma.controleOpOt.upsert({
    where: {
      ordrePaiementId_lotTraitementId: {
        ordrePaiementId: input.ordrePaiementId,
        lotTraitementId: input.lotTraitementId,
      },
    },
    update: {
      montantOt: new Prisma.Decimal(montantOt),
      montantOp: new Prisma.Decimal(input.montantOp),
      nombreLignesOt,
      nombreLignesOp: input.nombreLignesOp,
      ecart: new Prisma.Decimal(ecart),
      statutControle: conforme ? 'CONFORME' : 'ECART',
      dateControle: new Date(),
    },
    create: {
      ordrePaiementId: input.ordrePaiementId,
      referenceOp: input.referenceOp,
      bordereauId: input.bordereauId,
      lotTraitementId: input.lotTraitementId,
      montantOt: new Prisma.Decimal(montantOt),
      montantOp: new Prisma.Decimal(input.montantOp),
      nombreLignesOt,
      nombreLignesOp: input.nombreLignesOp,
      ecart: new Prisma.Decimal(ecart),
      statutControle: conforme ? 'CONFORME' : 'ECART',
    },
  });
};

export const listControles = async () => {
  return prisma.controleOpOt.findMany({
    orderBy: { dateControle: 'desc' },
    include: { bordereau: true, lotTraitement: true },
  });
};

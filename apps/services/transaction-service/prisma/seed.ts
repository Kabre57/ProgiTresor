import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client/index';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the transaction-service seed.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping seed in production');
    return;
  }

  console.log('Seeding transaction-service...');

  // ── Import Fichier ─────────────────────────────────────────
  const importFichier = await prisma.importFichier.upsert({
    where: { id: 1 },
    update: {
      nomFichier: 'TRESOR_PAY_2024_JANVIER.xlsx',
      typeFichier: 'XLSX',
      auteurId: 2,
      nbLignesLues: 100,
      nbLignesTraitees: 98,
      nbErreurs: 2,
      statut: 'TERMINE',
    },
    create: {
      id: 1,
      nomFichier: 'TRESOR_PAY_2024_JANVIER.xlsx',
      typeFichier: 'XLSX',
      auteurId: 2,
      nbLignesLues: 100,
      nbLignesTraitees: 98,
      nbErreurs: 2,
      statut: 'TERMINE',
    },
  });

  // ── Transactions ───────────────────────────────────────────
  const transactionsData = [
    {
      refTresor: 'TR-2024-001',
      dateHeure: new Date('2024-01-15T10:30:00Z'),
      montant: BigInt(50000),
      etudiantId: 1,
      antenneId: 1,
      nomenclatureId: 1,
      typeFluxId: 1,
      importId: importFichier.id,
      mois: 'JANVIER',
      nomPayeurBrut: 'KOUAME AFFOUE MARIE',
      libelleProduitBrut: '1ER VERSEMENT FRAIS DE SCOLARITE',
      statutTraitement: 'AFFECTE',
    },
    {
      refTresor: 'TR-2024-002',
      dateHeure: new Date('2024-01-16T14:20:00Z'),
      montant: BigInt(15000),
      etudiantId: 2,
      antenneId: 2,
      nomenclatureId: 3,
      typeFluxId: 2,
      importId: importFichier.id,
      mois: 'JANVIER',
      nomPayeurBrut: 'TRAORE BAKARY',
      libelleProduitBrut: 'FRAIS ENCADREMENT L1',
      statutTraitement: 'IMPORTE',
    },
  ] satisfies Prisma.TransactionUncheckedCreateInput[];

  for (const transaction of transactionsData) {
    await prisma.transaction.upsert({
      where: { refTresor: transaction.refTresor },
      update: transaction,
      create: transaction,
    });
  }

  // ── Ordre Paiement Miroir ──────────────────────────────────
  const ordresTraitementData = [
    { id: 1, codeOt: 'OT-2024-001', statut: 'Brouillon' },
    { id: 2, codeOt: 'OT-2024-002', statut: 'Transmis au Budget' },
  ] satisfies Prisma.OrdreTraitementMiroirCreateInput[];

  for (const op of ordresTraitementData) {
    await prisma.ordreTraitementMiroir.upsert({
      where: { id: op.id },
      update: { codeOt: op.codeOt, statut: op.statut },
      create: op,
    });
  }

  console.log('Transaction-service seeding completed.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

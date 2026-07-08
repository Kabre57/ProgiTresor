import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client/index';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the order-service seed.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping order-service seed in production.');
    return;
  }

  console.log('Seeding order-service...');

  // ── Synthèse OT ────────────────────────────────────────────
  const synthese = await prisma.syntheseOT.upsert({
    where: { reference: 'SYN-2024-JAN-001' },
    update: {},
    create: {
      reference: 'SYN-2024-JAN-001',
      periodeDebut: new Date('2024-01-01'),
      periodeFin: new Date('2024-01-31'),
      typeFluxId: 1,
      statut: 'Transmis',
      auteurId: 2,
      transmisParId: 2,
      montantTotal: BigInt(5000000),
      nbTransactions: 100,
    },
  });

  // ── Ordres de Traitement ───────────────────────────────────
  const ordresData = [
    {
      codeOt: 'OT-2024-ABJ-001',
      syntheseId: synthese.id,
      antenneId: 1,
      niveauId: 1,
      typeRecetteId: 1,
      montantCumule: BigInt(2500000),
      nombreFlux: 50,
      statut: 'Approuvé',
      creeParId: 2,
      valideParId: 3,
      dateEmission: new Date(),
    },
    {
      codeOt: 'OT-2024-ABJ-002',
      syntheseId: synthese.id,
      antenneId: 1,
      niveauId: 2,
      typeRecetteId: 1,
      montantCumule: BigInt(2500000),
      nombreFlux: 50,
      statut: 'Transmis',
      creeParId: 2,
    },
  ] satisfies Prisma.OrdreTraitementUncheckedCreateInput[];

  for (const o of ordresData) {
    await prisma.ordreTraitement.upsert({
      where: { codeOt: o.codeOt },
      update: {},
      create: o,
    });
  }

  console.log('Order-service seeding completed.');
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

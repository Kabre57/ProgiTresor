const path = require('node:path');

const mode = process.argv[2];
const service = process.argv[3];
const expectedDatabase = process.argv[4];

const databases = {
  etudiant: 'progi_etudiant',
  transaction: 'progi_transaction',
  order: 'progi_order',
  budget: 'progi_budget',
  compta: 'progi_compta',
  analyse: 'progi_analyse',
};

const preservedByService = {
  etudiant: [
    'antenne', 'filiere', 'statut_etudiant', 'promotion',
    'type_flux', 'type_recette', 'nomenclature_produit',
  ],
  transaction: [],
  order: [],
  budget: [],
  compta: [],
  analyse: [],
};

const quoteIdentifier = (value) => '"' + value.replaceAll('"', '""') + '"';

async function inspectDatabase(prisma) {
  const databaseRows = await prisma.$queryRawUnsafe('SELECT current_database() AS name');
  const database = databaseRows[0].name;
  if (database !== expectedDatabase || databases[service] !== expectedDatabase) {
    throw new Error('Database inattendue pour le service ' + service + ' : ' + database);
  }

  const tableRows = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
  );
  const allTables = tableRows.map((row) => row.table_name).filter((name) => name !== '_prisma_migrations');
  const preservedTables = new Set([...(preservedByService[service] || []), '_prisma_migrations']);
  const clearTables = allTables.filter((name) => !preservedTables.has(name));
  const counts = await Promise.all(allTables.map(async (table) => {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::bigint AS count FROM public.' + quoteIdentifier(table),
    );
    return { table, count: String(rows[0].count) };
  }));

  const tableCounts = new Map(counts.map((row) => [row.table, BigInt(row.count)]));
  const plannedDeletes = clearTables
    .filter((table) => tableCounts.get(table) > 0n)
    .map((table) => ({ table, count: String(tableCounts.get(table)) }));
  const retained = counts.filter(({ table }) => preservedTables.has(table));
  return { database, clearTables, plannedDeletes, retained };
}

async function main() {
  if (!databases[service] || !['plan', 'apply'].includes(mode)) {
    throw new Error('Usage interne invalide.');
  }

  const prismaModule = path.join(
    process.cwd(),
    'dist',
    'apps',
    'services',
    service + '-service',
    'src',
    'utils',
    'prisma.js',
  );
  const { prisma } = require(prismaModule);
  try {
    const plan = await inspectDatabase(prisma);
    if (mode === 'plan') {
      console.log(JSON.stringify({
        service,
        database: plan.database,
        rowsToDelete: plan.plannedDeletes,
        tablesToClear: plan.clearTables,
        protectedTables: plan.retained,
      }));
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (plan.clearTables.length > 0) {
        const tables = plan.clearTables.map((name) => 'public.' + quoteIdentifier(name)).join(', ');
        await tx.$executeRawUnsafe('TRUNCATE TABLE ' + tables);
      }
    });

    const after = await inspectDatabase(prisma);
    if (after.plannedDeletes.length > 0) {
      throw new Error('Des données ciblées restent présentes après le nettoyage.');
    }
    console.log(JSON.stringify({
      service,
      database: after.database,
      status: 'nettoye',
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error.message);
    process.exit(1);
  },
);

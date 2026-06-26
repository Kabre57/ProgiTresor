import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Configure dotenv to look for the database credentials in the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

let databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_TRANSACTION;
if (!databaseUrl) {
  throw new Error('DATABASE_URL or DATABASE_URL_TRANSACTION is required to run the transaction generator.');
}

// If we are running this script locally outside the Docker network, postgres is on localhost:5435
if (!process.env.IS_DOCKER && databaseUrl.includes('@postgres:5432')) {
  databaseUrl = databaseUrl.replace('@postgres:5432', '@localhost:5435');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MONTHS_FR = [
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
];

const getMonthFr = (date: Date): string => {
  return MONTHS_FR[date.getMonth()];
};

// Hardcoded fallback data in case etudiant-service is unreachable
const fallbackEtudiants = [
  { id: 1, matricule: '21P-0154ASIB', nom: 'KOUAME', prenom: 'Affoue Marie', antenneId: 1 },
  { id: 2, matricule: '22P-0987BKE', nom: 'TRAORE', prenom: 'Bakary', antenneId: 5 },
  { id: 7, matricule: 'PM-1781818964346', nom: 'POSTMAN-UPDATED', prenom: 'Tester', antenneId: 6 },
  { id: 20, matricule: 'IM-001', nom: 'TESTNOM', prenom: 'Testprenom', antenneId: 2 },
  { id: 21, matricule: 'IM-002', nom: 'TESTNOM2', prenom: 'Testprenom2', antenneId: 2 }
];

const fallbackNomenclatures = [
  { id: 11, libelleBrut: 'ASSURANCE ETUDIANTE', libelleStandard: 'Assurance etudiante', typeFluxId: 2 },
  { id: 7, libelleBrut: 'FRAIS DE BLOUSES', libelleStandard: 'Blouses', typeFluxId: 2 },
  { id: 10, libelleBrut: 'FRAIS DE CEREMONIE', libelleStandard: 'Ceremonie', typeFluxId: 2 },
  { id: 6, libelleBrut: 'FRAIS ENCADREMENT L1', libelleStandard: 'Encadrement L1', typeFluxId: 2 },
  { id: 2, libelleBrut: 'FRAIS INSCRIPTION L1 PUBLIC', libelleStandard: 'Inscription L1 Public', typeFluxId: 1 }
];

async function main() {
  console.log('Starting transaction generation process...');

  const clean = process.argv.includes('--clean') || process.argv.includes('-c');
  if (clean) {
    console.log('Cleaning existing transactions...');
    await prisma.transaction.deleteMany({});
    await prisma.importFichier.deleteMany({});
    console.log('Database cleaned.');
  }

  // 1. Resolve etudiant and nomenclatures from etudiant-service
  let etudiant = [...fallbackEtudiants];
  let nomenclatures = [...fallbackNomenclatures];

  const etudiantServiceUrl = process.env.IS_DOCKER 
    ? (process.env.ETUDIANT_SERVICE_URL || 'http://etudiant-service:5002')
    : 'http://localhost:5002';

  console.log(`Attempting to fetch reference metadata from etudiant-service at ${etudiantServiceUrl}...`);
  try {
    const etudiantRes = await fetch(`${etudiantServiceUrl}/`);
    if (etudiantRes.ok) {
      const data = await etudiantRes.json() as any[];
      if (Array.isArray(data) && data.length > 0) {
        etudiant = data.map(s => ({
          id: s.id,
          matricule: s.matricule,
          nom: s.nom,
          prenom: s.prenom,
          antenneId: s.antenneId
        }));
        console.log(`Successfully fetched ${etudiant.length} etudiant from etudiant-service.`);
      }
    }
  } catch (err) {
    console.warn('Could not fetch etudiant from etudiant-service, using fallback data.');
  }

  try {
    const nomsRes = await fetch(`${etudiantServiceUrl}/nomenclatures`);
    if (nomsRes.ok) {
      const data = await nomsRes.json() as any[];
      if (Array.isArray(data) && data.length > 0) {
        nomenclatures = data.map(n => ({
          id: n.id,
          libelleBrut: n.libelleBrut,
          libelleStandard: n.libelleStandard,
          typeFluxId: n.typeRecette?.typeFluxId || 1
        }));
        console.log(`Successfully fetched ${nomenclatures.length} nomenclatures from etudiant-service.`);
      }
    }
  } catch (err) {
    console.warn('Could not fetch nomenclatures from etudiant-service, using fallback data.');
  }

  // 2. Create the ImportFichier record
  console.log('Creating ImportFichier record...');
  const importFichier = await prisma.importFichier.create({
    data: {
      nomFichier: 'GENERATED_TEST_DATA_10K.csv',
      typeFichier: 'CSV',
      auteurId: 1,
      nbLignesLues: 10000,
      nbLignesTraitees: 10000,
      nbErreurs: 0,
      statut: 'TERMINE',
    }
  });

  // 3. Generate 10,000 transactions for the DB seeding
  console.log('Generating 10,000 transactions in memory...');
  const transactions: any[] = [];
  const now = new Date();

  for (let i = 1; i <= 10000; i++) {
    const etudiant = etudiant[(i - 1) % etudiant.length];
    const nom = nomenclatures[(i - 1) % nomenclatures.length];

    // Distribute date over the last 12 months (roughly 365 days)
    const daysOffset = Math.floor(Math.random() * 365);
    const txDate = new Date(now.getTime() - daysOffset * 24 * 60 * 60 * 1000);
    
    // Amount between 10000 and 150000
    const montant = BigInt(10000 + Math.floor(Math.random() * 29) * 5000);

    transactions.push({
      refTresor: `TR-2025-${i.toString().padStart(6, '0')}`,
      dateHeure: txDate,
      montant: montant,
      etudiantId: etudiant.id,
      antenneId: etudiant.antenneId,
      nomenclatureId: nom.id,
      typeFluxId: nom.typeFluxId,
      importId: importFichier.id,
      ordrePaiementId: null,
      mois: getMonthFr(txDate),
      nomPayeurBrut: `${etudiant.nom} ${etudiant.prenom}`,
      libelleProduitBrut: nom.libelleBrut,
      statutTraitement: 'IMPORTE',
      gele: false,
    });
  }

  // 4. Batch insert into the database (chunks of 1,000)
  console.log('Inserting transactions into the database in chunks of 1,000...');
  const chunkSize = 1000;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    await prisma.transaction.createMany({
      data: chunk
    });
    console.log(`Inserted chunk ${i / chunkSize + 1}/${transactions.length / chunkSize}...`);
  }

  // 5. Generate CSV import file
  console.log('Generating CSV import file content...');
  const csvHeaders = 'refTresor,dateHeure,montant,etudiantMatricule,libelleProduitBrut,nomPayeurBrut\n';
  let csvContent = csvHeaders;

  for (let i = 1; i <= 10000; i++) {
    const etudiant = etudiant[(i - 1) % etudiant.length];
    const nom = nomenclatures[(i - 1) % nomenclatures.length];
    
    const daysOffset = Math.floor(Math.random() * 365);
    const txDate = new Date(now.getTime() - daysOffset * 24 * 60 * 60 * 1000);
    const montant = 10000 + Math.floor(Math.random() * 29) * 5000;
    const ref = `IMP-2025-${i.toString().padStart(6, '0')}`;

    csvContent += `${ref},${txDate.toISOString()},${montant},${etudiant.matricule},"${nom.libelleBrut}","${etudiant.nom} ${etudiant.prenom}"\n`;
  }

  const scratchDir = path.resolve(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const csvPath = path.join(scratchDir, 'transactions_10k_import.csv');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`CSV import file successfully written to: ${csvPath}`);

  console.log('Transaction generation completed successfully.');
}

main()
  .catch((err) => {
    console.error('Error generating transactions:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

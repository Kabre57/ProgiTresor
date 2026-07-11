import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client/index';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the etudiant-service seed.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const antennesData = [
  { code: 'ABJ', nom: 'INFAS ABIDJAN', ville: 'Abidjan', actif: true },
  { code: 'BKE', nom: 'INFAS BOUAKE', ville: 'Bouake', actif: true },
  { code: 'DAL', nom: 'INFAS DALOA', ville: 'Daloa', actif: true },
  { code: 'KOR', nom: 'INFAS KORHOGO', ville: 'Korhogo', actif: true },
  { code: 'ABO', nom: 'INFAS ABENGOUROU', ville: 'Abengourou', actif: true },
  { code: 'ABG', nom: 'INFAS ABOISSO', ville: 'Aboisso', actif: true },
  { code: 'AGB', nom: 'INFAS AGBOVILLE', ville: 'Agboville', actif: true },
  { code: 'MAN', nom: 'INFAS MAN', ville: 'Man', actif: true },
] as const satisfies readonly Prisma.AntenneCreateInput[];

const statutsData = [
  { code: 'PUBLIC', libelle: 'Etudiant Public' },
  { code: 'PRIVE_NAT', libelle: 'Etudiant Prive National' },
  { code: 'PRIVE_NON_NAT', libelle: 'Etudiant Prive Non National' },
] as const satisfies readonly Prisma.StatutEtudiantCreateInput[];

const fluxData = [
  { code: 'BUDGET', libelle: 'Budget' },
  { code: 'HORS_BUDGET', libelle: 'Hors Budget' },
] as const satisfies readonly Prisma.TypeFluxCreateInput[];

const promotionsData = [
  { nom: 'Première année', ordre: 1, actif: true, niveau: 'Auxiliaire' },
  { nom: 'Première année', ordre: 1, actif: true, niveau: 'Licence' },
  { nom: 'Deuxième année', ordre: 2, actif: true, niveau: 'L2' },
  { nom: 'Troisième année', ordre: 3, actif: true, niveau: 'L3' },
] as const satisfies readonly Prisma.PromotionCreateInput[];

type AntenneCode = (typeof antennesData)[number]['code'];
type StatutCode = (typeof statutsData)[number]['code'];
type FluxCode = (typeof fluxData)[number]['code'];

const requireMapValue = <T>(map: Map<string, T>, code: string, label: string): T => {
  const value = map.get(code);
  if (!value) {
    throw new Error(`${label} not found after upsert: ${code}`);
  }
  return value;
};

async function main() {
  if (process.env.SKIP_SEED === 'true') {
    console.log('Skipping etudiant-service seed because SKIP_SEED=true');
    return;
  }

  console.log('Seeding etudiant-service...');

  const antennes = await Promise.all(
    antennesData.map((antenne) =>
      prisma.antenne.upsert({
        where: { code: antenne.code },
        update: {
          nom: antenne.nom,
          ville: antenne.ville,
          actif: antenne.actif,
        },
        create: antenne,
      }),
    ),
  );

  // Seed default filiere
  const filiereInfas = await prisma.filiere.upsert({
    where: { code: 'INFAS' },
    update: { abreviation: 'INFAS' },
    create: { code: 'INFAS', libelle: 'Institut de Formation aux Agents de Santé', abreviation: 'INFAS' }
  });

  const statuts = await Promise.all(
    statutsData.map((statut) =>
      prisma.statutEtudiant.upsert({
        where: { code: statut.code },
        update: { libelle: statut.libelle },
        create: statut,
      }),
    ),
  );

  const flux = await Promise.all(
    fluxData.map((item) =>
      prisma.typeFlux.upsert({
        where: { code: item.code },
        update: { libelle: item.libelle },
        create: item,
      }),
    ),
  );

  const promotions = await Promise.all(
    promotionsData.map((promo) =>
      prisma.promotion.upsert({
        where: { nom_niveau: { nom: promo.nom, niveau: promo.niveau } },
        update: {
          ordre: promo.ordre,
          actif: promo.actif,
          niveau: promo.niveau,
        },
        create: promo,
      }),
    ),
  );

  const antenneByCode = new Map<AntenneCode, (typeof antennes)[number]>(
    antennes.map((antenne) => [antenne.code as AntenneCode, antenne]),
  );
  const statutByCode = new Map<StatutCode, (typeof statuts)[number]>(
    statuts.map((statut) => [statut.code as StatutCode, statut]),
  );
  const fluxByCode = new Map<FluxCode, (typeof flux)[number]>(
    flux.map((item) => [item.code as FluxCode, item]),
  );

  const budgetFlux = requireMapValue(fluxByCode, 'BUDGET', 'TypeFlux');
  const horsBudgetFlux = requireMapValue(fluxByCode, 'HORS_BUDGET', 'TypeFlux');

  const recettesData = [
    { code: 'SCOLARITE', libelle: 'Frais de scolarite', typeFluxId: budgetFlux.id },
    { code: 'INSCRIPTION', libelle: "Frais d'inscription", typeFluxId: budgetFlux.id },
    { code: 'DROIT_EXAMEN', libelle: "Droits d'examen", typeFluxId: budgetFlux.id },
    { code: 'FRAIS_DIPLOME', libelle: 'Frais de diplome', typeFluxId: budgetFlux.id },
    { code: 'ENCADREMENT', libelle: "Frais d'encadrement", typeFluxId: horsBudgetFlux.id },
    { code: 'BLOUSES', libelle: 'Frais de blouses', typeFluxId: horsBudgetFlux.id },
    { code: 'KIT_STAGE', libelle: 'Kit de stage', typeFluxId: horsBudgetFlux.id },
    { code: 'VACCINATION', libelle: 'Frais de vaccination', typeFluxId: horsBudgetFlux.id },
    { code: 'CEREMONIE', libelle: 'Frais de ceremonie', typeFluxId: horsBudgetFlux.id },
    { code: 'ASSURANCE', libelle: 'Assurance etudiante', typeFluxId: horsBudgetFlux.id },
  ] satisfies Prisma.TypeRecetteUncheckedCreateInput[];

  const recettes = await Promise.all(
    recettesData.map((recette) =>
      prisma.typeRecette.upsert({
        where: { code: recette.code },
        update: {
          libelle: recette.libelle,
          typeFluxId: recette.typeFluxId,
        },
        create: recette,
      }),
    ),
  );

  const recetteByCode = new Map<string, (typeof recettes)[number]>(
    recettes.map((recette) => [recette.code, recette]),
  );

  const publicStatut = requireMapValue(statutByCode, 'PUBLIC', 'StatutEtudiant');
  const priveNationalStatut = requireMapValue(statutByCode, 'PRIVE_NAT', 'StatutEtudiant');

  const scolarite = requireMapValue(recetteByCode, 'SCOLARITE', 'TypeRecette');
  const inscription = requireMapValue(recetteByCode, 'INSCRIPTION', 'TypeRecette');
  const encadrement = requireMapValue(recetteByCode, 'ENCADREMENT', 'TypeRecette');
  const blouses = requireMapValue(recetteByCode, 'BLOUSES', 'TypeRecette');
  const kitStage = requireMapValue(recetteByCode, 'KIT_STAGE', 'TypeRecette');
  const vaccination = requireMapValue(recetteByCode, 'VACCINATION', 'TypeRecette');
  const ceremonie = requireMapValue(recetteByCode, 'CEREMONIE', 'TypeRecette');
  const assurance = requireMapValue(recetteByCode, 'ASSURANCE', 'TypeRecette');

  const promo1 = promotions.find((p) => p.nom === 'Première année' && p.niveau === 'Licence')!;
  const promo2 = promotions.find((p) => p.nom === 'Deuxième année')!;
  const promo3 = promotions.find((p) => p.nom === 'Troisième année')!;

  const nomenclaturesData = [
    {
      codeProduit: 'SCO-L1-PUB-V1',
      libelle: 'Scolarite L1 Public - Versement 1',
      typeRecetteId: scolarite.id,
      montant: 100000,
      actif: true,
    },
    {
      codeProduit: 'SCO-L1-PUB-V2',
      libelle: 'Scolarite L1 Public - Versement 2',
      typeRecetteId: scolarite.id,
      montant: 50000,
      actif: true,
    },
    {
      codeProduit: 'INS-L1-PUB',
      libelle: 'Inscription L1 Public',
      typeRecetteId: inscription.id,
      montant: 15000,
      actif: true,
    },
    {
      codeProduit: 'SCO-L2-PUB',
      libelle: 'Scolarite L2 Public',
      typeRecetteId: scolarite.id,
      montant: 150000,
      actif: true,
    },
    {
      codeProduit: 'SCO-L3-PRN',
      libelle: 'Scolarite L3 Prive National',
      typeRecetteId: scolarite.id,
      montant: 250000,
      actif: true,
    },
    {
      codeProduit: 'ENC-L1',
      libelle: 'Encadrement L1',
      typeRecetteId: encadrement.id,
      montant: 30000,
      actif: true,
    },
    {
      codeProduit: 'BLOUSE',
      libelle: 'Blouses',
      typeRecetteId: blouses.id,
      montant: 10000,
      actif: true,
    },
    {
      codeProduit: 'KIT-A1',
      libelle: 'Kit de stage A1',
      typeRecetteId: kitStage.id,
      montant: 20000,
      actif: true,
    },
    {
      codeProduit: 'VACCIN',
      libelle: 'Vaccination',
      typeRecetteId: vaccination.id,
      montant: 5000,
      actif: true,
    },
    {
      codeProduit: 'CEREM',
      libelle: 'Ceremonie',
      typeRecetteId: ceremonie.id,
      montant: 15000,
      actif: true,
    },
    {
      codeProduit: 'ASSUR',
      libelle: 'Assurance etudiante',
      typeRecetteId: assurance.id,
      montant: 5000,
      actif: true,
    },
  ];

  await Promise.all(
    nomenclaturesData.map((nomenclature) =>
      prisma.nomenclatureProduit.upsert({
        where: { codeProduit: nomenclature.codeProduit },
        update: nomenclature,
        create: nomenclature,
      }),
    ),
  );

  const abidjan = requireMapValue(antenneByCode, 'ABJ', 'Antenne');
  const bouake = requireMapValue(antenneByCode, 'BKE', 'Antenne');

  const dbNomenclatures = await prisma.nomenclatureProduit.findMany();
  const scoV1 = dbNomenclatures.find(n => n.codeProduit === 'SCO-L1-PUB-V1');
  const insL1 = dbNomenclatures.find(n => n.codeProduit === 'INS-L1-PUB');
  const scoL2 = dbNomenclatures.find(n => n.codeProduit === 'SCO-L2-PUB');

  const nomenclaturesToConnectForKouame = [];
  if (scoV1) nomenclaturesToConnectForKouame.push({ id: scoV1.id });
  if (insL1) nomenclaturesToConnectForKouame.push({ id: insL1.id });

  const nomenclaturesToConnectForTraore = [];
  if (scoL2) nomenclaturesToConnectForTraore.push({ id: scoL2.id });

  await prisma.etudiant.upsert({
    where: { matricule: '21P-0154ASIB' },
    update: {
      nom: 'KOUAME',
      prenom: 'Affoue Marie',
      prefixeMatricule: '21P',
      antenneId: abidjan.id,
      filiereId: filiereInfas.id,
      statutId: publicStatut.id,
      matriculeTresorPay: 'TP-KOUAME-01',
      promotionId: promo1.id,
      promotionString: promo1.nom,
      nomenclatures: {
        set: nomenclaturesToConnectForKouame
      }
    },
    create: {
      matricule: '21P-0154ASIB',
      nom: 'KOUAME',
      prenom: 'Affoue Marie',
      prefixeMatricule: '21P',
      antenneId: abidjan.id,
      filiereId: filiereInfas.id,
      statutId: publicStatut.id,
      matriculeTresorPay: 'TP-KOUAME-01',
      promotionId: promo1.id,
      promotionString: promo1.nom,
      nomenclatures: {
        connect: nomenclaturesToConnectForKouame
      }
    }
  });

  await prisma.etudiant.upsert({
    where: { matricule: '22P-0987BKE' },
    update: {
      nom: 'TRAORE',
      prenom: 'Bakary',
      prefixeMatricule: '22P',
      antenneId: bouake.id,
      filiereId: filiereInfas.id,
      statutId: publicStatut.id,
      matriculeTresorPay: 'TP-TRAORE-02',
      promotionId: promo2.id,
      promotionString: promo2.nom,
      nomenclatures: {
        set: nomenclaturesToConnectForTraore
      }
    },
    create: {
      matricule: '22P-0987BKE',
      nom: 'TRAORE',
      prenom: 'Bakary',
      prefixeMatricule: '22P',
      antenneId: bouake.id,
      filiereId: filiereInfas.id,
      statutId: publicStatut.id,
      matriculeTresorPay: 'TP-TRAORE-02',
      promotionId: promo2.id,
      promotionString: promo2.nom,
      nomenclatures: {
        connect: nomenclaturesToConnectForTraore
      }
    }
  });

  console.log('Etudiant-service seeding completed.');
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

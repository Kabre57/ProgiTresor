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

const niveauxData = [
  { code: 'L1', libelle: 'Licence 1', cycle: 'Licence', anneeEtude: 1 },
  { code: 'L2', libelle: 'Licence 2', cycle: 'Licence', anneeEtude: 2 },
  { code: 'L3', libelle: 'Licence 3', cycle: 'Licence', anneeEtude: 3 },
  { code: 'A1', libelle: 'Auxiliaire 1', cycle: 'Auxiliaire', anneeEtude: 1 },
  { code: 'A2', libelle: 'Auxiliaire 2', cycle: 'Auxiliaire', anneeEtude: 2 },
  { code: 'A3', libelle: 'Auxiliaire 3', cycle: 'Auxiliaire', anneeEtude: 3 },
  { code: 'SP2', libelle: 'Specialite 2', cycle: 'Specialite', anneeEtude: 2 },
] as const;

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
  { nom: 'Première année', ordre: 1, actif: true },
  { nom: 'Deuxième année', ordre: 2, actif: true },
  { nom: 'Troisième année', ordre: 3, actif: true },
] as const satisfies readonly Prisma.PromotionCreateInput[];

type AntenneCode = (typeof antennesData)[number]['code'];
type NiveauCode = (typeof niveauxData)[number]['code'];
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
    update: {},
    create: { code: 'INFAS', libelle: 'Institut de Formation aux Agents de Santé' }
  });

  // Seed study levels (niveaux) linked to the default filiere
  const niveaux = await Promise.all(
    niveauxData.map((niveau) =>
      prisma.niveau.upsert({
        where: { code: niveau.code },
        update: {
          libelle: niveau.libelle,
          cycle: niveau.cycle,
          anneeEtude: niveau.anneeEtude,
          filiereId: filiereInfas.id,
        },
        create: {
          code: niveau.code,
          libelle: niveau.libelle,
          cycle: niveau.cycle,
          anneeEtude: niveau.anneeEtude,
          filiereId: filiereInfas.id,
        },
      }),
    ),
  );

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
        where: { nom: promo.nom },
        update: {
          ordre: promo.ordre,
          actif: promo.actif,
        },
        create: promo,
      }),
    ),
  );

  const antenneByCode = new Map<AntenneCode, (typeof antennes)[number]>(
    antennes.map((antenne) => [antenne.code as AntenneCode, antenne]),
  );
  const niveauByCode = new Map<NiveauCode, (typeof niveaux)[number]>(
    niveaux.map((niveau) => [niveau.code as NiveauCode, niveau]),
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

  const l1 = requireMapValue(niveauByCode, 'L1', 'Niveau');
  const l2 = requireMapValue(niveauByCode, 'L2', 'Niveau');
  const l3 = requireMapValue(niveauByCode, 'L3', 'Niveau');
  const a1 = requireMapValue(niveauByCode, 'A1', 'Niveau');
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

  const nomenclaturesData = [
    {
      libelleBrut: '1ER VERSEMENT FRAIS DE SCOLARITE L1 PUBLIC',
      codeProduit: 'SCO-L1-PUB-V1',
      libelleStandard: 'Scolarite L1 Public - Versement 1',
      typeRecetteId: scolarite.id,
      niveauId: l1.id,
      statutId: publicStatut.id,
      numVersement: 1,
      actif: true,
    },
    {
      libelleBrut: '2EME VERSEMENT FRAIS DE SCOLARITE L1 PUBLIC',
      codeProduit: 'SCO-L1-PUB-V2',
      libelleStandard: 'Scolarite L1 Public - Versement 2',
      typeRecetteId: scolarite.id,
      niveauId: l1.id,
      statutId: publicStatut.id,
      numVersement: 2,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS INSCRIPTION L1 PUBLIC',
      codeProduit: 'INS-L1-PUB',
      libelleStandard: 'Inscription L1 Public',
      typeRecetteId: inscription.id,
      niveauId: l1.id,
      statutId: publicStatut.id,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS SCOLARITE L2 PUBLIC',
      codeProduit: 'SCO-L2-PUB',
      libelleStandard: 'Scolarite L2 Public',
      typeRecetteId: scolarite.id,
      niveauId: l2.id,
      statutId: publicStatut.id,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS SCOLARITE L3 PRIVE NATIONAL',
      codeProduit: 'SCO-L3-PRN',
      libelleStandard: 'Scolarite L3 Prive National',
      typeRecetteId: scolarite.id,
      niveauId: l3.id,
      statutId: priveNationalStatut.id,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS ENCADREMENT L1',
      codeProduit: 'ENC-L1',
      libelleStandard: 'Encadrement L1',
      typeRecetteId: encadrement.id,
      niveauId: l1.id,
      statutId: publicStatut.id,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS DE BLOUSES',
      codeProduit: 'BLOUSE',
      libelleStandard: 'Blouses',
      typeRecetteId: blouses.id,
      actif: true,
    },
    {
      libelleBrut: 'KIT DE STAGE A1',
      codeProduit: 'KIT-A1',
      libelleStandard: 'Kit de stage A1',
      typeRecetteId: kitStage.id,
      niveauId: a1.id,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS DE VACCINATION',
      codeProduit: 'VACCIN',
      libelleStandard: 'Vaccination',
      typeRecetteId: vaccination.id,
      actif: true,
    },
    {
      libelleBrut: 'FRAIS DE CEREMONIE',
      codeProduit: 'CEREM',
      libelleStandard: 'Ceremonie',
      typeRecetteId: ceremonie.id,
      actif: true,
    },
    {
      libelleBrut: 'ASSURANCE ETUDIANTE',
      codeProduit: 'ASSUR',
      libelleStandard: 'Assurance etudiante',
      typeRecetteId: assurance.id,
      actif: true,
    },
  ] satisfies Prisma.NomenclatureProduitUncheckedCreateInput[];

  await Promise.all(
    nomenclaturesData.map((nomenclature) =>
      prisma.nomenclatureProduit.upsert({
        where: { libelleBrut: nomenclature.libelleBrut },
        update: nomenclature,
        create: nomenclature,
      }),
    ),
  );

  const abidjan = requireMapValue(antenneByCode, 'ABJ', 'Antenne');
  const bouake = requireMapValue(antenneByCode, 'BKE', 'Antenne');

  const promo1 = promotions.find((p) => p.nom === 'Première année')!;
  const promo2 = promotions.find((p) => p.nom === 'Deuxième année')!;

  const etudiantData = [
    {
      matricule: '21P-0154ASIB',
      nom: 'KOUAME',
      prenom: 'Affoue Marie',
      prefixeMatricule: '21P',
      antenneId: abidjan.id,
      niveauId: l1.id,
      statutId: publicStatut.id,
      matriculeTresorPay: 'TP-KOUAME-01',
      promotionId: promo1.id,
      promotionString: promo1.nom,
    },
    {
      matricule: '22P-0987BKE',
      nom: 'TRAORE',
      prenom: 'Bakary',
      prefixeMatricule: '22P',
      antenneId: bouake.id,
      niveauId: l1.id,
      statutId: publicStatut.id,
      matriculeTresorPay: 'TP-TRAORE-02',
      promotionId: promo2.id,
      promotionString: promo2.nom,
    },
  ] satisfies Prisma.EtudiantUncheckedCreateInput[];

  await Promise.all(
    etudiantData.map((etudiant) =>
      prisma.etudiant.upsert({
        where: { matricule: etudiant.matricule },
        update: etudiant,
        create: etudiant,
      }),
    ),
  );

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

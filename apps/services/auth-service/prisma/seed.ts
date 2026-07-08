import 'dotenv/config';
import { Prisma, PrismaClient, type Permission, type Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the auth-service seed.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissionsData = [
  { code: 'IMPORT_FICHIER', libelle: 'Importer des fichiers de transactions', module: 'TRANSACTIONS' },
  { code: 'GERER_TRANSACTIONS', libelle: 'Gerer les transactions', module: 'TRANSACTIONS' },
  { code: 'GENERER_SYNTHESE', libelle: 'Generer des syntheses OT', module: 'ORDERS' },
  { code: 'VALIDER_OT', libelle: 'Valider des ordres de traitement', module: 'ORDERS' },
  { code: 'APPROUVER_OT', libelle: 'Approuver des ordres de traitement', module: 'ORDERS' },
  { code: 'EMETTRE_OT', libelle: 'Emettre des ordres de traitement', module: 'ORDERS' },
  { code: 'GERER_BUDGET', libelle: 'Gerer les bordereaux et ordres de paiement', module: 'BUDGET' },
  { code: 'GERER_COMPTA', libelle: 'Gerer les ecritures comptables', module: 'COMPTA' },
  { code: 'CONSULTER_RAPPORTS', libelle: 'Consulter les rapports et statistiques', module: 'REPORTING' },
  { code: 'GERER_UTILISATEURS', libelle: 'Gerer les utilisateurs et roles', module: 'ADMIN' },
] as const satisfies readonly Prisma.PermissionCreateInput[];

const rolesData = [
  { code: 'ADMIN', libelle: 'Administrateur', description: 'Acces complet au systeme' },
  { code: 'COMPTABLE', libelle: 'Comptable', description: 'Gestion des imports, transactions et OT' },
  { code: 'BUDGET', libelle: 'Agent Budget', description: 'Emission et suivi budgetaire des OT' },
  { code: 'CHEF_COMPTABLE', libelle: 'Chef Comptable', description: 'Validation comptable des OT' },
  { code: 'DF', libelle: 'Directeur Financier', description: 'Approbation finale des OT' },
  { code: 'CONSULTANT', libelle: 'Consultant', description: 'Acces en lecture seule' },
  { code: 'ETUDIANT', libelle: 'Etudiant', description: 'Portail de consultation et de rattachement' },
] as const satisfies readonly Prisma.RoleCreateInput[];

type PermissionCode = (typeof permissionsData)[number]['code'];
type RoleCode = (typeof rolesData)[number]['code'];

type SeedUser = {
  username: string;
  nom: string;
  prenom: string;
  email: string;
  roleCode: RoleCode;
  service: string;
  actif?: boolean;
};

const grants = {
  ADMIN: permissionsData.map((permission) => permission.code),
  COMPTABLE: [
    'IMPORT_FICHIER',
    'GERER_TRANSACTIONS',
    'GENERER_SYNTHESE',
    'CONSULTER_RAPPORTS',
  ],
  BUDGET: ['EMETTRE_OT', 'GERER_BUDGET', 'CONSULTER_RAPPORTS'],
  CHEF_COMPTABLE: ['VALIDER_OT', 'GERER_COMPTA', 'CONSULTER_RAPPORTS'],
  DF: ['APPROUVER_OT', 'CONSULTER_RAPPORTS'],
  CONSULTANT: ['CONSULTER_RAPPORTS'],
  ETUDIANT: [],
} satisfies Record<RoleCode, readonly PermissionCode[]>;

const usersData = [
  {
    username: 'admin',
    nom: 'Systeme',
    prenom: 'Administrateur',
    email: 'admin@progitresor.local',
    roleCode: 'ADMIN',
    service: 'Administration',
    actif: true,
  },
  {
    username: 'comptable',
    nom: 'Diallo',
    prenom: 'Aminata',
    email: 'comptable@progitresor.local',
    roleCode: 'COMPTABLE',
    service: 'Comptabilite',
    actif: true,
  },
  {
    username: 'budget',
    nom: 'Kouame',
    prenom: 'Eric',
    email: 'budget@progitresor.local',
    roleCode: 'BUDGET',
    service: 'Budget',
    actif: true,
  },
  {
    username: 'chef.comptable',
    nom: 'Traore',
    prenom: 'Mariam',
    email: 'chef.comptable@progitresor.local',
    roleCode: 'CHEF_COMPTABLE',
    service: 'Comptabilite',
    actif: true,
  },
  {
    username: 'df',
    nom: 'Mensah',
    prenom: 'Koffi',
    email: 'df@progitresor.local',
    roleCode: 'DF',
    service: 'Direction Financiere',
    actif: true,
  },
  {
    username: 'consultant',
    nom: 'Ndiaye',
    prenom: 'Fatou',
    email: 'consultant@progitresor.local',
    roleCode: 'CONSULTANT',
    service: 'Reporting',
    actif: true,
  },
  {
    username: '21P-0154ASIB',
    nom: 'KOUAME',
    prenom: 'Affoue Marie',
    email: 'marie.kouame@progitresor.local',
    roleCode: 'ETUDIANT',
    service: 'Etudiant',
    actif: true,
  },
] as const satisfies readonly SeedUser[];

const mapPermissionsByCode = (permissions: readonly Permission[]) => {
  const permissionByCode = new Map<PermissionCode, Permission>();
  for (const permission of permissions) {
    const seedPermission = permissionsData.find((item) => item.code === permission.code);
    if (seedPermission) {
      permissionByCode.set(seedPermission.code, permission);
    }
  }
  return permissionByCode;
};

const mapRolesByCode = (roles: readonly Role[]) => {
  const roleByCode = new Map<RoleCode, Role>();
  for (const role of roles) {
    const seedRole = rolesData.find((item) => item.code === role.code);
    if (seedRole) {
      roleByCode.set(seedRole.code, role);
    }
  }
  return roleByCode;
};

async function main() {
  if (process.env.SKIP_SEED === 'true') {
    console.log('Skipping auth-service seed because SKIP_SEED=true');
    return;
  }

  console.log('Seeding auth-service...');

  // Upsert des permissions en parallèle
  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.upsert({
        where: { code: permission.code },
        update: {
          libelle: permission.libelle,
          module: permission.module,
        },
        create: permission,
      })
    )
  );

  // Upsert des rôles en parallèle
  const roles = await Promise.all(
    rolesData.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          libelle: role.libelle,
          description: role.description,
        },
        create: role,
      })
    )
  );

  const permissionByCode = mapPermissionsByCode(permissions);
  const roleByCode = mapRolesByCode(roles);

  // Affectation des permissions de rôles
  for (const [roleCode, permissionCodes] of Object.entries(grants) as [RoleCode, readonly PermissionCode[]][]) {
    const role = roleByCode.get(roleCode);
    if (!role) {
      throw new Error(`Seed role not found after upsert: ${roleCode}`);
    }

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const permissionCode of permissionCodes) {
      const permission = permissionByCode.get(permissionCode);
      if (!permission) {
        throw new Error(`Seed permission not found after upsert: ${permissionCode}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const motDePasseHash = await bcrypt.hash('Password123!', 10);

  // Upsert des utilisateurs en parallèle
  await Promise.all(
    usersData.map((user) => {
      const role = roleByCode.get(user.roleCode);
      if (!role) {
        throw new Error(`Seed user role not found: ${user.roleCode}`);
      }
      return prisma.utilisateur.upsert({
        where: { email: user.email },
        update: {
          username: user.username,
          nom: user.nom,
          prenom: user.prenom,
          motDePasseHash,
          roleId: role.id,
          service: user.service,
          actif: user.actif ?? true,
        },
        create: {
          username: user.username,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          motDePasseHash,
          roleId: role.id,
          service: user.service,
          actif: user.actif ?? true,
        },
      });
    })
  );

  // Seeding des Périmètres et Niveaux Graduationnels
  console.log('Seeding des périmètres et niveaux graduationnels...');
  const perimeters = [
    { id: 'IMPORT', libelle: 'Importation' },
    { id: 'ANALYSE', libelle: 'Analyse et syntheses' },
    { id: 'OT', libelle: 'Ordres de Traitement' },
    { id: 'BUDGET', libelle: 'Traitement budgetaire' },
    { id: 'ADMIN', libelle: 'Administration' },
  ];

  const levels = [
    { level: 1, libelle: 'Lecture' },
    { level: 2, libelle: 'Écriture' },
    { level: 3, libelle: 'Validation' },
    { level: 4, libelle: 'Approbation' },
  ];

  const levelMap = new Map<string, number>();

  for (const p of perimeters) {
    await prisma.perimeter.upsert({
      where: { id: p.id },
      update: { libelle: p.libelle },
      create: p,
    });

    for (const lvl of levels) {
      const dbLvl = await prisma.perimeterLevel.upsert({
        where: {
          perimeterId_level: {
            perimeterId: p.id,
            level: lvl.level,
          },
        },
        update: { libelle: lvl.libelle },
        create: {
          perimeterId: p.id,
          level: lvl.level,
          libelle: lvl.libelle,
        },
      });
      levelMap.set(`${p.id}:${lvl.level}`, dbLvl.id);
    }
  }

  // Association des acteurs métiers aux niveaux graduationnels
  const actorAssignments: Record<string, Record<string, number>> = {
    admin: { IMPORT: 4, ANALYSE: 4, OT: 4, BUDGET: 4, ADMIN: 4 },
    comptable: { IMPORT: 3, ANALYSE: 2, OT: 1, BUDGET: 1 }, // Comptable -> lecture budgetaire
    budget: { IMPORT: 1, ANALYSE: 1, OT: 3, BUDGET: 3 }, // Agent Budget -> traitement des lots et OP
    consultant: { IMPORT: 1, ANALYSE: 1, OT: 1, BUDGET: 1 },
    'chef.comptable': { IMPORT: 2, ANALYSE: 3, OT: 2, BUDGET: 2 },
    df: { IMPORT: 1, ANALYSE: 4, OT: 4, BUDGET: 4, ADMIN: 1 },
  };

  for (const [username, perms] of Object.entries(actorAssignments)) {
    const user = await prisma.utilisateur.findUnique({
      where: { username },
    });
    if (!user) continue;

    await prisma.userPerimeterLevel.deleteMany({
      where: { userId: user.id },
    });

    for (const [perimeterId, level] of Object.entries(perms)) {
      const levelId = levelMap.get(`${perimeterId}:${level}`);
      if (levelId) {
        await prisma.userPerimeterLevel.create({
          data: {
            userId: user.id,
            perimeterLevelId: levelId,
          },
        });
      }
    }
  }

  console.log('Auth-service seeding completed.');
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

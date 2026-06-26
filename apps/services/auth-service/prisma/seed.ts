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
  { code: 'GENERER_SYNTHESE', libelle: 'Generer des syntheses OP', module: 'ORDERS' },
  { code: 'VALIDER_OP', libelle: 'Valider des ordres de paiement', module: 'ORDERS' },
  { code: 'APPROUVER_OP', libelle: 'Approuver des ordres de paiement', module: 'ORDERS' },
  { code: 'EMETTRE_OP', libelle: 'Emettre des ordres de paiement', module: 'ORDERS' },
  { code: 'GERER_COMPTA', libelle: 'Gerer les ecritures comptables', module: 'COMPTA' },
  { code: 'CONSULTER_RAPPORTS', libelle: 'Consulter les rapports et statistiques', module: 'REPORTING' },
  { code: 'GERER_UTILISATEURS', libelle: 'Gerer les utilisateurs et roles', module: 'ADMIN' },
] as const satisfies readonly Prisma.PermissionCreateInput[];

const rolesData = [
  { code: 'ADMIN', libelle: 'Administrateur', description: 'Acces complet au systeme' },
  { code: 'COMPTABLE', libelle: 'Comptable', description: 'Gestion des imports, transactions et OP' },
  { code: 'BUDGET', libelle: 'Agent Budget', description: 'Emission et suivi budgetaire des OP' },
  { code: 'CHEF_COMPTABLE', libelle: 'Chef Comptable', description: 'Validation comptable des OP' },
  { code: 'DF', libelle: 'Directeur Financier', description: 'Approbation finale des OP' },
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
    'EMETTRE_OP',
    'CONSULTER_RAPPORTS',
  ],
  BUDGET: ['EMETTRE_OP', 'CONSULTER_RAPPORTS'],
  CHEF_COMPTABLE: ['VALIDER_OP', 'GERER_COMPTA', 'CONSULTER_RAPPORTS'],
  DF: ['APPROUVER_OP', 'CONSULTER_RAPPORTS'],
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

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.upsert({
        where: { code: permission.code },
        update: {
          libelle: permission.libelle,
          module: permission.module,
        },
        create: permission,
      }),
    ),
  );

  const roles = await Promise.all(
    rolesData.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          libelle: role.libelle,
          description: role.description,
        },
        create: role,
      }),
    ),
  );

  const permissionByCode = mapPermissionsByCode(permissions);
  const roleByCode = mapRolesByCode(roles);

  for (const [roleCode, permissionCodes] of Object.entries(grants) as [RoleCode, readonly PermissionCode[]][]) {
    const role = roleByCode.get(roleCode);

    if (!role) {
      throw new Error(`Seed role not found after upsert: ${roleCode}`);
    }

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

  for (const user of usersData) {
    const role = roleByCode.get(user.roleCode);

    if (!role) {
      throw new Error(`Seed user role not found: ${user.roleCode}`);
    }

    await prisma.utilisateur.upsert({
      where: { username: user.username },
      update: {
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the auth-service seed.');
}
const pool = new pg_1.Pool({ connectionString: databaseUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
];
// Hash bcrypt du mot de passe initial fourni pour le super administrateur.
const adminPasswordHash = '$2a$12$N6mqxDQ5ajwHYsUIbjXzgub6qeckUzPWaJ06takYOzERvIBgIp3lC';
const adminEmail = 'admin@progitresor.online';
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
async function main() {
    if (process.env.SKIP_SEED === 'true') {
        console.log('Skipping auth-service seed because SKIP_SEED=true');
        return;
    }
    await prisma.$transaction(async (tx) => {
        // Réutiliser aussi l'ancien compte de bootstrap sans dupliquer son username.
        const existingAdmins = await tx.utilisateur.findMany({
            where: { OR: [{ email: adminEmail }, { username: adminEmail }, { username: 'admin' }] },
        });
        if (existingAdmins.length > 1) {
            throw new Error('Deux comptes distincts utilisent déjà le username admin et l’adresse du super administrateur.');
        }
        const roleData = {
            code: 'ADMIN',
            libelle: 'Super administrateur',
            description: 'Acces complet au systeme',
        };
        const role = await tx.role.upsert({
            where: { code: roleData.code },
            update: roleData,
            create: roleData,
        });
        for (const permissionData of permissionsData) {
            const permission = await tx.permission.upsert({
                where: { code: permissionData.code },
                update: permissionData,
                create: permissionData,
            });
            await tx.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
                update: {},
                create: { roleId: role.id, permissionId: permission.id },
            });
        }
        const userData = {
            username: adminEmail,
            nom: 'Systeme',
            prenom: 'Super administrateur',
            email: adminEmail,
            motDePasseHash: adminPasswordHash,
            roleId: role.id,
            service: 'Administration',
            actif: true,
        };
        const existingAdmin = existingAdmins[0];
        const admin = existingAdmin
            ? await tx.utilisateur.update({
                where: { id: existingAdmin.id },
                data: { ...userData, tokenVersion: { increment: 1 } },
            })
            : await tx.utilisateur.create({ data: userData });
        // Invalider les anciennes sessions lors de la réinitialisation des accès.
        await tx.refreshToken.deleteMany({ where: { utilisateurId: admin.id } });
        await tx.permissionExclusion.deleteMany({ where: { userId: admin.id } });
        await tx.userPerimeterLevel.deleteMany({ where: { userId: admin.id } });
        for (const perimeter of perimeters) {
            await tx.perimeter.upsert({
                where: { id: perimeter.id },
                update: perimeter,
                create: perimeter,
            });
            for (const level of levels) {
                const perimeterLevel = await tx.perimeterLevel.upsert({
                    where: { perimeterId_level: { perimeterId: perimeter.id, level: level.level } },
                    update: { libelle: level.libelle },
                    create: { perimeterId: perimeter.id, ...level },
                });
                if (level.level === 4) {
                    await tx.userPerimeterLevel.create({
                        data: { userId: admin.id, perimeterLevelId: perimeterLevel.id },
                    });
                }
            }
        }
    }, { timeout: 30000 });
    console.log('Super administrateur créé ou mis à jour : ' + adminEmail);
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});

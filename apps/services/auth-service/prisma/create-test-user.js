'use strict';

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const email = 'test.recette@progitresor.online';
const MIN_PASSWORD_LENGTH = 8;
const password = process.env.TEST_USER_PASSWORD;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est requis.');
if (!password || password.length < MIN_PASSWORD_LENGTH) {
  throw new Error(`TEST_USER_PASSWORD doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const motDePasseHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const role = await tx.role.findUnique({ where: { code: 'ADMIN' } });
    if (!role) throw new Error('Exécuter le seed administrateur avant de créer le compte de recette.');
    const matches = await tx.utilisateur.findMany({
      where: { OR: [{ email }, { username: email }] },
    });
    if (matches.length > 1 || (matches[0] && matches[0].service !== 'Recette fonctionnelle')) {
      throw new Error('Cette adresse ou cet identifiant appartient déjà à un autre compte.');
    }
    const data = {
      username: email, email, nom: 'Recette', prenom: 'Testeur',
      service: 'Recette fonctionnelle', roleId: role.id, actif: true, motDePasseHash,
    };
    const account = matches[0]
      ? await tx.utilisateur.update({
          where: { id: matches[0].id }, data: { ...data, tokenVersion: { increment: 1 } },
        })
      : await tx.utilisateur.create({ data });

    await tx.refreshToken.deleteMany({ where: { utilisateurId: account.id } });
    await tx.permissionExclusion.deleteMany({ where: { userId: account.id } });
    await tx.userPerimeterLevel.deleteMany({ where: { userId: account.id } });
    for (const perimeterId of ['IMPORT', 'ANALYSE', 'OT', 'BUDGET', 'ADMIN']) {
      const level = await tx.perimeterLevel.findUnique({
        where: { perimeterId_level: { perimeterId, level: 4 } },
      });
      if (!level) throw new Error('Niveau administrateur manquant pour ' + perimeterId);
      await tx.userPerimeterLevel.create({
        data: { userId: account.id, perimeterLevelId: level.id },
      });
    }
    return account;
  }, { timeout: 30000 });
  console.log(JSON.stringify({ id: user.id, username: user.username, role: 'ADMIN', perimeters: 5 }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});

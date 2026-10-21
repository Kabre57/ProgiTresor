import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import * as users from '../repositories/userRepository';
import type { UserWithRole } from '../repositories/userRepository';
import { AppError, UnauthorizedError } from '../utils/errors';

const invalidLogin = () => new UnauthorizedError('Identifiant ou mot de passe incorrect.');

/** Les fiches importées deviennent accessibles sans créer manuellement un compte. */
export async function loginStudent(
  username: string,
  password: string,
  existing: UserWithRole | null,
): Promise<UserWithRole> {
  const matricule = username.trim().toUpperCase();
  // Ne jamais appliquer cette règle aux comptes des agents ou aux comptes suspendus.
  if ((existing && (existing.role.code !== 'ETUDIANT' || !existing.actif)) ||
      !matricule || matricule.length > 50 || password !== matricule) {
    throw invalidLogin();
  }
  const baseUrl = process.env.ETUDIANT_SERVICE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    throw new AppError(503, 'La connexion au registre étudiant n’est pas configurée.');
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(matricule)}`, {
      headers: { 'x-internal-secret': secret },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AppError(503, 'Le registre étudiant est momentanément indisponible.');
  }
  if (response.status === 404) throw invalidLogin();
  if (!response.ok) throw new AppError(503, 'Le registre étudiant est momentanément indisponible.');
  let student: { matricule?: string; nom?: string; prenom?: string; estTemporaire?: boolean };
  try {
    student = await response.json() as typeof student;
  } catch {
    throw new AppError(503, 'Réponse du registre étudiant invalide.');
  }
  if (!student || student.matricule !== matricule || student.estTemporaire ||
      !student.nom || !student.prenom) throw invalidLogin();

  const user = existing ?? await users.findUserByUsername(matricule);
  if (user) {
    if (!user.actif || user.role.code !== 'ETUDIANT') throw invalidLogin();
    // Appliquer la règle aux anciens comptes étudiants sans réinitialiser les agents.
    if (!await bcrypt.compare(password, user.motDePasseHash)) {
      return users.updateUser(user.id, { motDePasseHash: await bcrypt.hash(password, 12) });
    }
    return user;
  }
  const role = await prisma.role.upsert({
    where: { code: 'ETUDIANT' }, update: {},
    create: { code: 'ETUDIANT', libelle: 'Étudiant' },
  });
  try {
    const created = await users.createUser({
      username: matricule, nom: student.nom, prenom: student.prenom,
      // Adresse technique réservée : aucune adresse personnelle n'est inventée.
      email: `etudiant-${crypto.createHash('sha256').update(matricule).digest('hex').slice(0, 40)}@comptes.invalid`,
      motDePasseHash: await bcrypt.hash(password, 12), roleId: role.id,
      service: 'Portail étudiant',
    });
    await users.createAuditLog(created.id, 'CREATE', 'Compte étudiant créé à la première connexion.', 'Utilisateur', String(created.id));
    return created;
  } catch (error) {
    // Deux premières connexions simultanées ne doivent pas produire une erreur 500.
    if ((error as { code?: string }).code !== 'P2002') throw error;
    const concurrent = await users.findUserByUsername(matricule);
    if (!concurrent?.actif || concurrent.role.code !== 'ETUDIANT' ||
        !await bcrypt.compare(password, concurrent.motDePasseHash)) throw invalidLogin();
    return concurrent;
  }
}

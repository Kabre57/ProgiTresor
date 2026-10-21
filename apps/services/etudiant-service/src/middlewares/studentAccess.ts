import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/** Le rôle étudiant ne donne accès qu'à sa fiche et aux référentiels en lecture. */
export function restrictStudentAccess(req: Request, _res: Response, next: NextFunction) {
  const role = String(req.headers['x-user-role'] || '').toUpperCase();
  if (role !== 'ETUDIANT') return next();
  const username = String(req.headers['x-user-name'] || '').trim().toUpperCase();
  let path: string;
  try { path = decodeURIComponent(req.path).replace(/\/$/, ''); }
  catch { return next(new ForbiddenError('Accès étudiant refusé.')); }
  const readOnlyReferences = [
    '/me', '/antennes', '/filieres', '/promotions', '/niveaux',
    '/statuts-etudiants', '/nomenclatures', '/types-flux', '/types-recettes',
  ];
  if (req.method === 'GET' && readOnlyReferences.includes(path)) return next();
  if (username && !username.includes('/')) {
    const ownPath = `/${username}`;
    const normalizedPath = path.toUpperCase();
    if (req.method === 'GET' && [ownPath, `${ownPath}/FINANCIAL-SUMMARY`].includes(normalizedPath)) return next();
    if (req.method === 'POST' && normalizedPath === `${ownPath}/GENERATE-ATTESTATION`) return next();
    // Le contrôleur remplace le matricule soumis par celui de la session.
    if (req.method === 'POST' && path === '/tresor-pay/map') return next();
  }
  return next(new ForbiddenError('Vous pouvez consulter uniquement votre dossier étudiant.'));
}

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { hasAccess } from '../../../../../shared/utils/permission.utils';

/**
 * Interface pour les requêtes authentifiées via le Gateway.
 */
interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
  userName?: string;
  userPerms?: Record<string, number>;
  userDenies?: string[];
}

const parseJsonHeader = <T>(value: string | string[] | undefined, fallback: T): T => {
  if (!value || Array.isArray(value)) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

/**
 * Middleware d'extraction des informations utilisateur depuis les headers du Gateway.
 */
export const extractUserFromHeaders = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const userName = req.headers['x-user-name'];
  const userPerms = req.headers['x-user-permissions'];
  const userDenies = req.headers['x-user-denies'];

  if (userId) req.userId = parseInt(userId as string);
  if (userRole) req.userRole = userRole as string;
  if (userName) req.userName = userName as string;
  req.userPerms = parseJsonHeader<Record<string, number>>(userPerms, {});
  req.userDenies = parseJsonHeader<string[]>(userDenies, []);

  next();
};

/**
 * Middleware d'autorisation basé sur les rôles.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.userRole || (req.headers['x-user-role'] as string);
    if (!role || !allowedRoles.includes(role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};

export const authorizePerimeter = (perimeter: string, requiredLevel: number, action = 'ACCESS') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.userRole || (req.headers['x-user-role'] as string);
    const requestedMatricule = String(req.query.etudiantMatricule ?? '').trim().toUpperCase();
    const username = String(req.userName ?? req.headers['x-user-name'] ?? '').trim().toUpperCase();
    const isOwnStudentRead =
      (role === 'ETUDIANT' || role === 'Etudiant') &&
      perimeter === 'IMPORT' &&
      action === 'READ' &&
      req.method === 'GET' &&
      requestedMatricule.length > 0 &&
      requestedMatricule === username;

    if (!isOwnStudentRead && !hasAccess(req.userPerms ?? {}, req.userDenies ?? [], perimeter, action, requiredLevel)) {
      return next(new ForbiddenError('Insufficient perimeter level'));
    }
    next();
  };
};

export const validateInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_API_SECRET;

  if (!expected || secret !== expected) {
    res.status(403).json({ error: 'Forbidden: Invalid internal secret' });
    return;
  }
  next();
};

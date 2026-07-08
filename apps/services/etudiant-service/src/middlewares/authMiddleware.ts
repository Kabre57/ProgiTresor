import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Interface pour les requêtes authentifiées via le Gateway.
 * Le Gateway injecte les headers X-User-Id, X-User-Role, X-User-Name
 * après validation du JWT.
 */
interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
  userName?: string;
}

/**
 * Middleware d'extraction des informations utilisateur depuis les headers du Gateway.
 * Ne bloque pas si les headers sont absents (la sécurité est gérée au niveau Gateway).
 */
export const extractUserFromHeaders = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const userName = req.headers['x-user-name'];

  if (userId) req.userId = parseInt(userId as string);
  if (userRole) req.userRole = userRole as string;
  if (userName) req.userName = userName as string;

  next();
};

/**
 * Middleware d'autorisation basé sur les rôles.
 * Vérifie que le rôle de l'utilisateur (injecté par le Gateway) fait partie
 * des rôles autorisés.
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

export const validateInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_API_SECRET;

  if (!expected || secret !== expected) {
    res.status(403).json({ error: 'Forbidden: Invalid internal secret' });
    return;
  }
  next();
};

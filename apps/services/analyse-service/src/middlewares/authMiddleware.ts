import { Request, Response, NextFunction } from 'express';
import { hasAccess } from '../../../../../shared/utils/permission.utils';
import { ForbiddenError } from '../utils/errors';

interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
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

export const extractUserFromHeaders = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (userId) req.userId = parseInt(userId as string, 10);
  if (userRole) req.userRole = userRole as string;
  req.userPerms = parseJsonHeader<Record<string, number>>(req.headers['x-user-permissions'], {});
  req.userDenies = parseJsonHeader<string[]>(req.headers['x-user-denies'], []);

  next();
};

export const authorizePerimeter = (perimeter: string, requiredLevel: number, action = 'ACCESS') => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!hasAccess(req.userPerms ?? {}, req.userDenies ?? [], perimeter, action, requiredLevel)) {
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
